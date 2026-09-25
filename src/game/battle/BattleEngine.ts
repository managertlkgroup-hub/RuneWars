// RUNE WARS — движок боя: применяет эффекты цветов, ход врага, победа/поражение

import { BoardEngine, type BoardEvent } from "./BoardEngine";
import { Hero } from "./Hero";
import { Enemy } from "./Enemy";
import type { MatchGroup } from "./types";
import { GEM_BASE, CAPS, lengthMultiplier, cascadeBonus } from "../content/balance";
import type { HeroDef } from "../content/heroes";
import type { EnemyDef } from "../content/enemies";

export type BattleEvent =
  | { type: "matchVfx"; groups: MatchGroup[]; cascadeLevel: number }
  | { type: "playerDamage"; amount: number; crit: boolean; dodged: boolean }
  | { type: "playerHeal"; amount: number }
  | { type: "playerShield"; amount: number }
  | { type: "playerRage"; amount: number; rageStrike: boolean }
  | { type: "enemyAttack"; amount: number; shieldAbsorbed: number; hpDamage: number; brokeShield: boolean }
  | { type: "turnStart"; turn: number }
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
  turn: number;
  enemyAttackIn: number;
  phase: "idle" | "fighting" | "victory" | "defeat";
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

  constructor(heroDef: HeroDef, enemyDef: EnemyDef, heroLevel = 1, metrics?: BoardEngine["metrics"]) {
    this.hero = new Hero(heroDef, heroLevel);
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
  }

  private applyMatches(groups: MatchGroup[], cascadeLevel: number) {
    const hero = this.hero;
    const enemy = this.enemy;
    const mult = 1 + cascadeBonus(cascadeLevel);
    for (const g of groups) {
      const lm = lengthMultiplier(g.length);
      const base = {
        damage: GEM_BASE.damage[Math.min(g.length, GEM_BASE.damage.length - 1)],
        shield: GEM_BASE.shield[Math.min(g.length, GEM_BASE.shield.length - 1)],
        heal: GEM_BASE.heal[Math.min(g.length, GEM_BASE.heal.length - 1)],
        rage: GEM_BASE.rage[Math.min(g.length, GEM_BASE.rage.length - 1)],
      };
      const favored = g.color === hero.def.favoredColor ? hero.def.favoredBonus : 1.0;

      if (g.color === 0) {
        // красный — атака
        let dmg = base.damage * lm * mult * favored;
        // ярость-удар ×2
        let rageStrike = false;
        if (hero.canRageStrike()) {
          dmg *= 2;
          hero.consumeRageStrike();
          rageStrike = true;
        }
        // dodge (тень)
        const dodged = enemy.hasDodge && Math.random() < 0.3;
        if (!dodged) {
          // cap по урону за ход
          const room = Math.max(0, CAPS.damagePerTurn - this.damageThisTurn);
          const applied = Math.min(dmg, room);
          if (applied > 0) {
            enemy.takeDamage(applied);
            this.damageThisTurn += applied;
          }
          this.emit({ type: "playerDamage", amount: applied, crit: rageStrike, dodged: false });
        } else {
          this.emit({ type: "playerDamage", amount: 0, crit: false, dodged: true });
        }
        // победа сразу при смерти
        if (enemy.isDead()) {
          this.phase = "victory";
          this.emit({ type: "victory" });
          return;
        }
      } else if (g.color === 1) {
        // синий — щит
        let sh = base.shield * lm * mult * favored;
        const room = Math.max(0, CAPS.shieldPerTurn - this.shieldThisTurn);
        const applied = Math.min(sh, room);
        if (applied > 0) {
          hero.addShield(applied);
          this.shieldThisTurn += applied;
        }
        this.emit({ type: "playerShield", amount: applied });
      } else if (g.color === 2) {
        // зелёный — лечение
        let hl = base.heal * lm * mult * favored;
        const room = Math.max(0, CAPS.healPerTurn - this.healThisTurn);
        const applied = Math.min(hl, room);
        if (applied > 0) {
          hero.heal(applied);
          this.healThisTurn += applied;
        }
        this.emit({ type: "playerHeal", amount: applied });
      } else if (g.color === 3) {
        // жёлтый — ярость
        let rg = base.rage * lm * mult * favored;
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

  private endTurn() {
    if (this.phase !== "fighting") return;
    this.turn++;
    this.emit({ type: "turnStart", turn: this.turn });

    // тик кулдаунов героя
    this.hero.tickCooldowns();

    // сброс per-turn счётчиков
    this.damageThisTurn = 0;
    this.shieldThisTurn = 0;
    this.healThisTurn = 0;
    this.rageThisTurn = 0;

    // ход врага
    const willAttack = this.enemy.tickAttack();
    if (willAttack && !this.enemy.isDead()) {
      this.enemyAttack();
    }

    // проверка конца боя
    if (this.enemy.isDead()) {
      this.phase = "victory";
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
    if (brokeShield) {
      // игнор щита
      hpDamage = atk;
      hero.hp = Math.max(0, hero.hp - atk);
    } else {
      const beforeShield = hero.shield;
      const beforeHp = hero.hp;
      hero.takeDamage(atk);
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

  /** Снимпshot состояния для UI. */
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
      turn: this.turn,
      enemyAttackIn: this.enemy.attackCountdown,
      phase: this.phase,
    };
  }
}
