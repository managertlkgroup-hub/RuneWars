// RUNE WARS — движок боя: эффекты цветов, руны, ход врага, победа/поражение

import { BoardEngine, type BoardEvent } from "./BoardEngine";
import { Hero } from "./Hero";
import { Enemy } from "./Enemy";
import type { MatchGroup, GemColor } from "./types";
import { GEM_BASE, CAPS, lengthMultiplier, cascadeBonus } from "../content/balance";
import type { HeroDef } from "../content/heroes";
import type { EnemyDef } from "../content/enemies";
import type { RuneDef, RuneId } from "../content/runes";
import type { Item } from "../content/items";
import type { PerkDef } from "../content/perks";

export interface RunBonuses {
  redDamageFlat?: number;
  maxHpBonus?: number;
  regenPerTurn?: number;
  startShield?: number;
  startRage?: number;
}

export type PerkEffects = PerkDef["effect"];

export type BattleEvent =
  | { type: "matchVfx"; groups: MatchGroup[]; cascadeLevel: number }
  | { type: "playerDamage"; amount: number; crit: boolean; dodged: boolean }
  | { type: "playerHeal"; amount: number }
  | { type: "playerShield"; amount: number }
  | { type: "playerRage"; amount: number; rageStrike: boolean }
  | { type: "enemyAttack"; amount: number; shieldAbsorbed: number; hpDamage: number; brokeShield: boolean }
  | { type: "turnStart"; turn: number }
  | { type: "runeTriggered"; rune: RuneId; cells?: { row: number; col: number }[] }
  | { type: "bombVfx"; row: number; col: number; colors: GemColor[] }
  | { type: "enemyFrozen" }
  | { type: "victory" }
  | { type: "defeat" };

export type BattleEventListener = (e: BattleEvent) => void;

export interface BattleState {
  heroHp: number;
  heroMaxHp: number;
  heroShield: number;
  heroRage: number;
  heroRageStrikeReady: boolean;
  enemyHp: number;
  enemyMaxHp: number;
  enemyName: string;
  enemyIsBoss: boolean;
  enemyFrozen: boolean;
  turn: number;
  enemyAttackIn: number;
  phase: "idle" | "fighting" | "victory" | "defeat";
  equippedRunes: RuneId[];
}

export class BattleEngine {
  board: BoardEngine;
  hero: Hero;
  enemy: Enemy;
  turn: number = 0;
  private listener: BattleEventListener | null = null;
  phase: "idle" | "fighting" | "victory" | "defeat" = "idle";

  // накопленные за ход эффекты (для cap)
  private damageThisTurn = 0;
  private shieldThisTurn = 0;
  private healThisTurn = 0;
  private rageThisTurn = 0;
  // вампир: лечение за ход (max 5)
  private vampireHealThisTurn = 0;
  // внутри-забежные бонусы
  private runBonuses: RunBonuses = {};
  // эффекты перков (мета-прогрессия)
  private perkEffects: PerkEffects = {};
  // некромант: счётчик убийств в забеге (+10% урона за каждое)
  private necroKills: number = 0;

  constructor(
    heroDef: HeroDef,
    enemyDef: EnemyDef,
    heroLevel = 1,
    equippedRunes: { def: RuneDef; level: number }[] = [],
    metrics?: BoardEngine["metrics"],
    equippedItems?: { weapon: Item | null; armor: Item | null; amulet: Item | null },
    startHp?: number,
    runBonuses?: RunBonuses,
    perkEffects?: PerkEffects
  ) {
    this.hero = new Hero(heroDef, heroLevel);
    // передать уровни экипированных рун
    const runeLevels = equippedRunes.map((r) => r.level);
    const runeDefs = equippedRunes.map((r) => r.def);
    this.hero.equipRunes(runeDefs, runeLevels);
    if (equippedItems) this.hero.equipItems(equippedItems);
    this.perkEffects = perkEffects ?? {};
    // перк-эффекты: +макс HP
    if (this.perkEffects.maxHp) this.hero.maxHp += this.perkEffects.maxHp;
    // внутри-забежные бонусы: +макс HP
    if (runBonuses?.maxHpBonus) {
      this.hero.maxHp += runBonuses.maxHpBonus;
    }
    // стартовый HP (переносимый)
    if (startHp !== undefined && startHp > 0) {
      this.hero.hp = Math.min(this.hero.maxHp, startHp);
    }
    this.hero.applyCarriedShield();
    // перк-эффекты: авто-щит + старт ярость
    if (this.perkEffects.autoShield) this.hero.shield = Math.min(this.hero.maxShield, this.hero.shield + this.perkEffects.autoShield);
    if (this.perkEffects.startRage) this.hero.rage = Math.min(this.hero.maxRage, this.hero.rage + this.perkEffects.startRage);
    // стартовые щит/ярость от зелий
    if (runBonuses?.startShield) {
      this.hero.shield = Math.min(this.hero.maxShield, this.hero.shield + runBonuses.startShield);
    }
    if (runBonuses?.startRage) {
      this.hero.rage = Math.min(this.hero.maxRage, this.hero.rage + runBonuses.startRage);
    }
    this.runBonuses = runBonuses ?? {};
    this.enemy = new Enemy(enemyDef);
    this.board = new BoardEngine(metrics ?? {
      cellSize: 60,
      originX: 366,
      originY: 120,
      boardW: 420,
      boardH: 420,
    });
    this.board.listener = this.onBoardEvent.bind(this);
  }

  setBattleListener(l: BattleEventListener) {
    this.listener = l;
  }

  private emit(e: BattleEvent) {
    if (this.listener) this.listener(e);
  }

  private onBoardEvent(e: BoardEvent) {
    if (this.phase !== "fighting") return;
    if (e.type === "match") {
      this.emit({ type: "matchVfx", groups: e.groups, cascadeLevel: e.cascadeLevel });
      this.applyMatches(e.groups, e.cascadeLevel);
    } else if (e.type === "turnEnd") {
      this.endTurn();
    }
  }

  start() {
    this.phase = "fighting";
    this.turn = 0;
    this.damageThisTurn = 0;
    this.shieldThisTurn = 0;
    this.healThisTurn = 0;
    this.rageThisTurn = 0;
    this.vampireHealThisTurn = 0;
  }

  private applyMatches(groups: MatchGroup[], cascadeLevel: number) {
    const hero = this.hero;
    const enemy = this.enemy;
    const mult = 1 + cascadeBonus(cascadeLevel);
    // руна Мудрец: +1 к длине для множителя
    const sage = hero.getRune("sage");
    // руна Хаос: считаем обмены (по turnEnd, но здесь — по факту матча)
    for (const g of groups) {
      // эффективная длина с Мудрецом
      const sageBonus = sage ? (sage.level === 1 ? 1 : sage.level === 2 ? 2 : 3) : 0;
      const effLen = sage && sage.canUse() ? g.length + sageBonus : g.length;
      const lm = lengthMultiplier(effLen);
      const base = {
        damage: GEM_BASE.damage[Math.min(g.length, GEM_BASE.damage.length - 1)],
        shield: GEM_BASE.shield[Math.min(g.length, GEM_BASE.shield.length - 1)],
        heal: GEM_BASE.heal[Math.min(g.length, GEM_BASE.heal.length - 1)],
        rage: GEM_BASE.rage[Math.min(g.length, GEM_BASE.rage.length - 1)],
      };
      const favored = g.color === hero.def.favoredColor ? hero.def.favoredBonus : 1.0;
      const mechId = hero.def.mechanicId;

      if (g.color === 0) {
        // красный — атака (по умолчанию)
        let dmg = base.damage * lm * mult * favored;
        // МАГ: красный = замедление врага (задержка атаки на 1 ход), без урона
        if (mechId === "mage") {
          // замедлить врага — отложить атаку на 1 ход
          enemy.attackCountdown = Math.max(enemy.attackCountdown, 1);
          this.emit({ type: "runeTriggered", rune: "ice" });
          this.emit({ type: "enemyFrozen" });
          dmg = 0;
        }
        // ЖРИЦА: красный = слабый урон (8→5, ×0.625)
        if (mechId === "priestess") dmg *= 0.625;
        // ПАЛАДИН: красный = атака + щит (+3)
        if (mechId === "paladin") {
          const sb = 3 * lm * mult;
          hero.addShield(sb);
          this.emit({ type: "playerShield", amount: sb });
        }
        // бонусы предметов: оружие (+% урона, легендарный fury_strike)
        dmg *= hero.redDamageMultiplier();
        // внутри-забежный бонус: точильный камень (+flat к урону)
        if (this.runBonuses.redDamageFlat) dmg += this.runBonuses.redDamageFlat;
        // перк-бонус: +flat к урону красных
        if (this.perkEffects.redDamageFlat) dmg += this.perkEffects.redDamageFlat;
        // уровень героя: +1 урон красным за уровень
        dmg += (hero.level - 1);
        // перк: шанс крита красных (×1.5)
        if (this.perkEffects.critChance && Math.random() < this.perkEffects.critChance) {
          dmg *= 1.5;
          rageStrike = rageStrike || true; // отметить как крит для VFX
        }
        // НЕКРОМАНТ: +10% урона за каждое убийство в забеге
        if (mechId === "necromancer") dmg *= 1 + this.necroKills * 0.1;
        // руна Огонь: +50% на длине 3-4
        const fire = hero.getRune("fire");
        if (fire && fire.canUse() && g.length >= 3 && g.length <= 4) {
          dmg *= fire.effectivePower;
          fire.markUsed();
          this.emit({ type: "runeTriggered", rune: "fire" });
        }
        // ярость-удар (×2 базово, ×3 с Гневом)
        let rageStrike = false;
        if (hero.canRageStrike()) {
          dmg *= hero.rageStrikeMultiplier();
          hero.consumeRageStrike();
          rageStrike = true;
        }
        // dodge (тень) + РАЗБОЙНИК: синий даёт уклонение (обработано в синем)
        const dodged = enemy.hasDodge && Math.random() < 0.3;
        if (!dodged && dmg > 0) {
          const room = Math.max(0, CAPS.damagePerTurn - this.damageThisTurn);
          const applied = Math.min(dmg, room);
          if (applied > 0) {
            enemy.takeDamage(applied);
            this.damageThisTurn += applied;
            // руна Вампир: 20% урона → HP, max 5/ход
            const vamp = hero.getRune("vampire");
            if (vamp && applied > 0) {
              const vampireCap = vamp.level === 1 ? 5 : vamp.level === 2 ? 8 : 12;
          const vHeal = Math.min(vampireCap - this.vampireHealThisTurn, applied * vamp.effectivePower);
              if (vHeal > 0) {
                const healed = hero.heal(vHeal);
                this.vampireHealThisTurn += healed;
                if (healed > 0) this.emit({ type: "playerHeal", amount: healed });
              }
            }
            // перк-вампиризм: 5% урона → HP (вне капа, max 3/ход)
            if (this.perkEffects.vampirePct && applied > 0) {
              const vHeal = Math.min(3, applied * this.perkEffects.vampirePct);
              if (vHeal > 0) {
                const healed = hero.heal(vHeal);
                if (healed > 0) this.emit({ type: "playerHeal", amount: healed });
              }
            }
          }
          this.emit({ type: "playerDamage", amount: applied, crit: rageStrike, dodged: false });
          // руна Кузнец: бомба на красном 5+
          const smith = hero.getRune("smith");
          const smithThreshold = smith ? (smith.level === 1 ? 5 : smith.level === 2 ? 4 : 3) : 5;
          if (smith && smith.canUse() && g.length >= smithThreshold && smith.bombsThisTurn < 1) {
            this.triggerBomb(g);
            smith.markUsed();
            smith.bombsThisTurn++;
            this.emit({ type: "runeTriggered", rune: "smith" });
          }
        } else {
          this.emit({ type: "playerDamage", amount: 0, crit: false, dodged: true });
        }
        if (enemy.isDead()) {
          this.necroKills++;
          this.phase = "victory";
          this.hero.preserveShieldOnVictory();
          this.emit({ type: "victory" });
          return;
        }
      } else if (g.color === 1) {
        // синий — по умолчанию щит
        // МАГ: синий = урон (8 вместо щита)
        if (mechId === "mage") {
          let dmg = 8 * lm * mult * favored;
          dmg *= hero.redDamageMultiplier();
          if (this.runBonuses.redDamageFlat) dmg += this.runBonuses.redDamageFlat;
          dmg += (hero.level - 1);
          const room = Math.max(0, CAPS.damagePerTurn - this.damageThisTurn);
          const applied = Math.min(dmg, room);
          if (applied > 0) { enemy.takeDamage(applied); this.damageThisTurn += applied; }
          this.emit({ type: "playerDamage", amount: applied, crit: false, dodged: false });
          if (enemy.isDead()) { this.necroKills++; this.phase = "victory"; this.hero.preserveShieldOnVictory(); this.emit({ type: "victory" }); return; }
          continue;
        }
        // РАЗБОЙНИК: синий = уклонение (10% шанс уклонения от след атаки)
        if (mechId === "rogue") {
          // даёт временный «щит-уклонение» через addShield (упрощённо)
          const dodge = Math.ceil(base.shield * 0.5 * lm * mult);
          hero.addShield(dodge);
          this.emit({ type: "playerShield", amount: dodge });
          continue;
        }
        let sh = base.shield * lm * mult * favored;
        // перк: множитель щита
        if (this.perkEffects.shieldMult) sh *= 1 + this.perkEffects.shieldMult;
        // руна Лёд: синий 4+ замораживает врага
        const ice = hero.getRune("ice");
        if (ice && ice.canUse() && g.length >= 4 && !enemy.frozen) {
          enemy.freeze();
          ice.markUsed();
          const iceCooldown = ice.level === 1 ? 2 : ice.level === 2 ? 1 : 0;
          ice.setCooldown(iceCooldown);
          this.emit({ type: "runeTriggered", rune: "ice" });
          this.emit({ type: "enemyFrozen" });
        }
        const room = Math.max(0, CAPS.shieldPerTurn - this.shieldThisTurn);
        // бонус брони: +shield за синий матч (вне капа)
        const itemShieldBonus = hero.itemBonuses.shieldBonus ?? 0;
        const applied = Math.min(sh, room);
        const totalApplied = applied + (itemShieldBonus > 0 ? hero.addShield(itemShieldBonus) : 0);
        if (applied > 0) {
          hero.addShield(applied);
          this.shieldThisTurn += applied;
        }
        this.emit({ type: "playerShield", amount: totalApplied });
      } else if (g.color === 2) {
        // зелёный — лечение
        let hl = base.heal * lm * mult * favored;
        // перк: множитель лечения + flat
        if (this.perkEffects.healMult) hl *= 1 + this.perkEffects.healMult;
        if (this.perkEffects.healFlat) hl += this.perkEffects.healFlat;
        // ЖРИЦА: зелёный = лечение + щит (комбо)
        if (mechId === "priestess") {
          const sb = Math.floor(base.shield * 0.5 * lm * mult);
          hero.addShield(sb);
          this.emit({ type: "playerShield", amount: sb });
        }
        // руна Жизнь: двойное лечение + реген (зависит от уровня)
        const life = hero.getRune("life");
        if (life && life.canUse()) {
          hl *= life.effectivePower;
          const regenPerTurn = life.level === 1 ? 2 : life.level === 2 ? 3 : 4;
          const regenStacks = life.level === 3 ? 4 : 3;
          life.lifeRegenStacks = regenStacks;
          life.markUsed();
          this.emit({ type: "runeTriggered", rune: "life" });
        }
        const room = Math.max(0, CAPS.healPerTurn - this.healThisTurn);
        const applied = Math.min(hl, room);
        if (applied > 0) {
          hero.heal(applied);
          this.healThisTurn += applied;
        }
        this.emit({ type: "playerHeal", amount: applied });
      } else if (g.color === 3) {
        // жёлтый — по умолчанию ярость
        // РАЗБОЙНИК: жёлтый = крит-урон (×2 при 50% шансе)
        if (mechId === "rogue") {
          const crit = Math.random() < 0.5;
          let dmg = base.damage * lm * mult * favored * (crit ? 2 : 1);
          dmg *= hero.redDamageMultiplier();
          dmg += (hero.level - 1);
          const room = Math.max(0, CAPS.damagePerTurn - this.damageThisTurn);
          const applied = Math.min(dmg, room);
          if (applied > 0) { enemy.takeDamage(applied); this.damageThisTurn += applied; }
          this.emit({ type: "playerDamage", amount: applied, crit, dodged: false });
          if (enemy.isDead()) { this.necroKills++; this.phase = "victory"; this.hero.preserveShieldOnVictory(); this.emit({ type: "victory" }); return; }
          continue;
        }
        let rg = base.rage * lm * mult * favored;
        // перк: множитель ярости
        if (this.perkEffects.rageMult) rg *= 1 + this.perkEffects.rageMult;
        // руна Гнев: ярость ×2
        const wrath = hero.getRune("wrath");
        if (wrath && wrath.canUse()) {
          rg *= wrath.effectivePower;
          wrath.markUsed();
          this.emit({ type: "runeTriggered", rune: "wrath" });
        }
        const room = Math.max(0, CAPS.ragePerTurn - this.rageThisTurn);
        const applied = Math.min(rg, room);
        if (applied > 0) {
          hero.addRage(applied);
          this.rageThisTurn += applied;
        }
        this.emit({ type: "playerRage", amount: applied, rageStrike: false });
      }
    }
  }

  /** Руна Кузнец: бомба 3×3 — применяет базовые эффекты всех цветов в области. */
  private triggerBomb(matchGroup: MatchGroup) {
    const center = matchGroup.cells[Math.floor(matchGroup.cells.length / 2)];
    const colors: GemColor[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = center.row + dr;
        const c = center.col + dc;
        if (r < 0 || r >= 7 || c < 0 || c >= 7) continue;
        const gem = this.board.grid[r][c];
        if (gem) colors.push(gem.color);
      }
    }
    this.emit({ type: "bombVfx", row: center.row, col: center.col, colors });
    // применить базовые эффекты по цветам
    const hero = this.hero;
    const enemy = this.enemy;
    for (const color of colors) {
      if (color === 0) {
        const room = Math.max(0, CAPS.damagePerTurn - this.damageThisTurn);
        const applied = Math.min(8, room);
        if (applied > 0) {
          enemy.takeDamage(applied);
          this.damageThisTurn += applied;
          this.emit({ type: "playerDamage", amount: applied, crit: false, dodged: false });
        }
      } else if (color === 1) {
        const room = Math.max(0, CAPS.shieldPerTurn - this.shieldThisTurn);
        const applied = Math.min(5, room);
        if (applied > 0) {
          hero.addShield(applied);
          this.shieldThisTurn += applied;
          this.emit({ type: "playerShield", amount: applied });
        }
      } else if (color === 2) {
        const room = Math.max(0, CAPS.healPerTurn - this.healThisTurn);
        const applied = Math.min(4, room);
        if (applied > 0) {
          hero.heal(applied);
          this.healThisTurn += applied;
          this.emit({ type: "playerHeal", amount: applied });
        }
      } else if (color === 3) {
        const room = Math.max(0, CAPS.ragePerTurn - this.rageThisTurn);
        const applied = Math.min(8, room);
        if (applied > 0) {
          hero.addRage(applied);
          this.rageThisTurn += applied;
          this.emit({ type: "playerRage", amount: applied, rageStrike: false });
        }
      }
    }
  }

  private endTurn() {
    if (this.phase !== "fighting") return;
    this.turn++;
    this.emit({ type: "turnStart", turn: this.turn });

    // реген от Жизни
    const regen = this.hero.applyLifeRegen();
    if (regen > 0) this.emit({ type: "playerHeal", amount: regen });

    // бонусы амулета: +ярость/ход, +HP/ход (вне капов)
    const ib = this.hero.itemBonuses;
    if ((ib.ragePerTurn ?? 0) > 0) {
      const r = this.hero.addRage(ib.ragePerTurn!);
      if (r > 0) this.emit({ type: "playerRage", amount: r, rageStrike: false });
    }
    if ((ib.healPerTurn ?? 0) > 0) {
      const h = this.hero.heal(ib.healPerTurn!);
      if (h > 0) this.emit({ type: "playerHeal", amount: h });
    }
    // внутри-забежный бонус: регенерация (+HP/ход, вне капа)
    if ((this.runBonuses.regenPerTurn ?? 0) > 0) {
      const h = this.hero.heal(this.runBonuses.regenPerTurn!);
      if (h > 0) this.emit({ type: "playerHeal", amount: h });
    }
    // перк-регенерация (+HP/ход, вне капа)
    if ((this.perkEffects.regenPerTurn ?? 0) > 0) {
      const h = this.hero.heal(this.perkEffects.regenPerTurn!);
      if (h > 0) this.emit({ type: "playerHeal", amount: h });
    }

    // тик кулдаунов героя (руны + ярость)
    this.hero.tickCooldowns();

    // сброс per-turn счётчиков
    this.damageThisTurn = 0;
    this.shieldThisTurn = 0;
    this.healThisTurn = 0;
    this.rageThisTurn = 0;
    this.vampireHealThisTurn = 0;

    // руна Хаос: каждый 5-й ход — перекраска
    const chaos = this.hero.getRune("chaos");
    const chaosThreshold = chaos ? (chaos.level === 1 ? 5 : chaos.level === 2 ? 4 : 3) : 5;
    if (chaos && this.turn % chaosThreshold === 0) {
      const changed = this.board.chaosRecolor();
      if (changed.length > 0) {
        this.emit({ type: "runeTriggered", rune: "chaos", cells: changed });
      }
    }

    // ход врага
    const willAttack = this.enemy.tickAttack();
    if (willAttack && !this.enemy.isDead()) {
      this.enemyAttack();
    }

    if (this.enemy.isDead()) {
      this.phase = "victory";
      this.hero.preserveShieldOnVictory();
      this.emit({ type: "victory" });
    } else if (this.hero.isDead()) {
      this.phase = "defeat";
      this.emit({ type: "defeat" });
    }
  }

  private enemyAttack() {
    const hero = this.hero;
    const enemy = this.enemy;
    const atk = enemy.def.attack;
    const brokeShield = enemy.hasShieldbreak;
    let shieldAbsorbed = 0;
    let hpDamage = 0;
    // перк-уклонение: шанс полностью уклониться
    if (this.perkEffects.dodgeChance && Math.random() < this.perkEffects.dodgeChance) {
      this.emit({ type: "enemyAttack", amount: atk, shieldAbsorbed: 0, hpDamage: 0, brokeShield: false });
      // уклонение — emit игрок промах
      this.emit({ type: "playerDamage", amount: 0, crit: false, dodged: true });
      return;
    }
    if (brokeShield) {
      hpDamage = atk;
      hero.hp = Math.max(0, hero.hp - atk);
    } else {
      const beforeShield = hero.shield;
      const beforeHp = hero.hp;
      // перк-поглощение: щит эффективнее
      const absorbMult = 1 + (this.perkEffects.shieldAbsorb ?? 0);
      const effectiveAtk = atk / absorbMult;
      hero.takeDamage(Math.ceil(effectiveAtk));
      shieldAbsorbed = beforeShield - hero.shield;
      hpDamage = beforeHp - hero.hp;
    }
    this.emit({
      type: "enemyAttack",
      amount: atk,
      shieldAbsorbed,
      hpDamage,
      brokeShield,
    });
  }

  snapshot(): BattleState {
    return {
      heroHp: this.hero.hp,
      heroMaxHp: this.hero.maxHp,
      heroShield: this.hero.shield,
      heroRage: this.hero.rage,
      heroRageStrikeReady: this.hero.canRageStrike(),
      enemyHp: this.enemy.hp,
      enemyMaxHp: this.enemy.maxHp,
      enemyName: this.enemy.def.name,
      enemyIsBoss: this.enemy.def.isBoss,
      enemyFrozen: this.enemy.frozen,
      turn: this.turn,
      enemyAttackIn: this.enemy.attackCountdown,
      phase: this.phase,
      equippedRunes: this.hero.runes.map((r) => r.id),
    };
  }
}
