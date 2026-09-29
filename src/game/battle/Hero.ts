// RUNE WARS — герой (HP/щит/ярость/уровень/руны/предметы)

import type { HeroDef } from "../content/heroes";
import type { RuneDef } from "../content/runes";
import { RuneState } from "./Rune";
import { CAPS } from "../content/balance";
import type { Item, ItemBonus } from "../content/items";

export interface FloatNumber {
  value: number;
  kind: "damage" | "heal" | "shield" | "rage" | "enemyDamage";
  x: number;
  y: number;
  life: number;
  maxLife: number;
  vy: number;
}

export class Hero {
  def: HeroDef;
  level: number;
  maxHp: number;
  hp: number;
  shield: number;
  rage: number;
  // кулдаун ярость-удара (в ходах)
  rageStrikeCooldown: number;
  // экипированные руны (до 3)
  runes: RuneState[] = [];
  // экипированные предметы
  equippedItems: { weapon: Item | null; armor: Item | null; amulet: Item | null } = {
    weapon: null,
    armor: null,
    amulet: null,
  };
  // счётчик для легендарного оружия (fury_strike: каждый 3-й красный +50%)
  private redMatchCount: number = 0;
  // сохранённый щит от Стража (для перехода между боями)
  carriedShield: number = 0;

  constructor(def: HeroDef, level = 1) {
    this.def = def;
    this.level = level;
    this.maxHp = def.baseHp + (level - 1) * 5;
    this.hp = this.maxHp;
    this.shield = 0;
    this.rage = 0;
    this.rageStrikeCooldown = 0;
  }

  /** Экипировать руны (до 3) с уровнем. */
  equipRunes(defs: RuneDef[], levels?: number[]): void {
    this.runes = defs.map((d, i) => new RuneState(d, levels?.[i] ?? 1));
  }

  /** Экипировать предметы — применяет бонусы к статам. */
  equipItems(items: { weapon?: Item | null; armor?: Item | null; amulet?: Item | null }): void {
    this.equippedItems.weapon = items.weapon ?? null;
    this.equippedItems.armor = items.armor ?? null;
    this.equippedItems.amulet = items.amulet ?? null;
    // пересчитать maxHp с бонусом брони
    const baseMax = this.def.baseHp + (this.level - 1) * 5;
    const armorBonus = this.equippedItems.armor?.bonus.maxHpBonus ?? 0;
    const prevMax = this.maxHp;
    this.maxHp = baseMax + armorBonus;
    // сохранить пропорцию HP
    if (prevMax > 0) {
      const ratio = this.hp / prevMax;
      this.hp = Math.min(this.maxHp, Math.round(this.maxHp * ratio));
    }
  }

  /** Сумма всех бонусов предметов. */
  get itemBonuses(): ItemBonus {
    const b: ItemBonus = {};
    let dmg = 0;
    let shield = 0;
    let rage = 0;
    let heal = 0;
    for (const slot of [this.equippedItems.weapon, this.equippedItems.armor, this.equippedItems.amulet]) {
      if (!slot) continue;
      dmg += slot.bonus.damageBonus ?? 0;
      shield += slot.bonus.shieldBonus ?? 0;
      rage += slot.bonus.ragePerTurn ?? 0;
      heal += slot.bonus.healPerTurn ?? 0;
      if (slot.bonus.legendaryEffect) b.legendaryEffect = slot.bonus.legendaryEffect;
    }
    if (dmg) b.damageBonus = dmg;
    if (shield) b.shieldBonus = shield;
    if (rage) b.ragePerTurn = rage;
    if (heal) b.healPerTurn = heal;
    return b;
  }

  /** Найти руну по id. */
  getRune(id: RuneDef["id"]): RuneState | undefined {
    return this.runes.find((r) => r.id === id);
  }

  get maxShield() {
    return CAPS.shieldMax;
  }
  get maxRage() {
    return CAPS.rageMax;
  }

  /** Множитель урона красных матчей с учётом оружия (и легендарного эффекта fury_strike). */
  redDamageMultiplier(): number {
    const b = this.itemBonuses;
    let mult = 1 + (b.damageBonus ?? 0);
    // легендарный меч fury_strike: каждый 3-й красный матч +50%
    if (b.legendaryEffect === "fury_strike") {
      this.redMatchCount++;
      if (this.redMatchCount % 3 === 0) mult *= 1.5;
    }
    return mult;
  }

  /** Добавить щит (с лимитом 50). */
  addShield(amount: number): number {
    const before = this.shield;
    this.shield = Math.min(this.maxShield, this.shield + amount);
    return this.shield - before;
  }

  /** Лечение (с лимитом maxHp). */
  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  /** Добавить ярость (с лимитом 60). */
  addRage(amount: number): number {
    const before = this.rage;
    this.rage = Math.min(this.maxRage, this.rage + amount);
    return this.rage - before;
  }

  /** Готов ли ярость-удар. Wrath-руна делает ульту ×3. */
  canRageStrike(): boolean {
    return this.rage >= 30 && this.rageStrikeCooldown <= 0;
  }

  rageStrikeMultiplier(): number {
    const wrath = this.getRune("wrath");
    if (!wrath) return 2;
    return wrath.level === 1 ? 3 : wrath.level === 2 ? 3.5 : 4;
  }

  consumeRageStrike(): void {
    this.rage = 0;
    this.rageStrikeCooldown = CAPS.rageStrikeCooldownTurns;
  }

  /** Получить урон: сначала щит, потом HP. */
  takeDamage(amount: number): number {
    let remaining = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) {
      this.hp = Math.max(0, this.hp - remaining);
    }
    return amount;
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  /** Тик пер-ходовых кулдаунов: руны + ярость. */
  tickCooldowns(): void {
    if (this.rageStrikeCooldown > 0) this.rageStrikeCooldown--;
    for (const r of this.runes) r.tick();
  }

  /** Реген от руны Жизнь. */
  applyLifeRegen(): number {
    const life = this.getRune("life");
    if (!life || life.lifeRegenStacks <= 0) return 0;
    const heal2 = life.tickRegen();
    if (heal2 > 0) {
      return this.heal(heal2);
    }
    return 0;
  }

  /** Сохранить щит для перехода между боями (руна Страж + легендарная броня iron_skin). */
  preserveShieldOnVictory(): void {
    const guardian = this.getRune("guardian");
    let factor = 0;
    if (guardian) {
      factor = guardian.level === 1 ? 0.5 : guardian.level === 2 ? 0.75 : 1.0;
    }
    // легендарная броня iron_skin: +15% к сохранению
    if (this.equippedItems.armor?.bonus.legendaryEffect === "iron_skin") {
      factor = Math.max(factor, 0.5) + 0.15;
    }
    if (factor > 0) {
      this.carriedShield = Math.floor(this.shield * factor);
    }
  }

  /** Применить переносимый щит в начале нового боя. */
  applyCarriedShield(): void {
    if (this.carriedShield > 0) {
      this.shield = Math.min(this.maxShield, this.carriedShield);
      this.carriedShield = 0;
    }
  }
}
