// RUNE WARS — герой (HP/щит/ярость/уровень/руны)

import type { HeroDef } from "../content/heroes";
import type { RuneDef } from "../content/runes";
import { RuneState } from "./Rune";
import { CAPS } from "../content/balance";

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
  // сохранённый щит от Стража (для перехода между боями)
  carriedShield: number = 0;

  constructor(def: HeroDef, level = 1) {
    this.def = def;
    this.level = level;
    // +5 HP за уровень выше 1
    this.maxHp = def.baseHp + (level - 1) * 5;
    this.hp = this.maxHp;
    this.shield = 0;
    this.rage = 0;
    this.rageStrikeCooldown = 0;
  }

  /** Экипировать руны (до 3). */
  equipRunes(defs: RuneDef[]): void {
    this.runes = defs.map((d) => new RuneState(d, 1));
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

  /** Добавить щит (с лимитом 50). */
  addShield(amount: number): number {
    const before = this.shield;
    this.shield = Math.min(this.maxShield, this.shield + amount);
    return this.shield - before;
  }

  /** Лечение (с лимитом maxHp). Возвращает реально добавленное. */
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

  /** Готов ли ярость-удар. Wrath-руна делает ульту ×3 вместо ×2. */
  canRageStrike(): boolean {
    return this.rage >= 30 && this.rageStrikeCooldown <= 0;
  }

  /** Множитель ярость-удара: ×2 базово, ×3 с руной Гнева. */
  rageStrikeMultiplier(): number {
    const wrath = this.getRune("wrath");
    return wrath ? 3 : 2;
  }

  /** Совершить ярость-удар: сбросить ярость до 0 и поставить кулдаун 3 хода. */
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

  /** Тик пер-ходовых кулдаунов (вызывается в конце хода): руны + ярость. */
  tickCooldowns(): void {
    if (this.rageStrikeCooldown > 0) this.rageStrikeCooldown--;
    for (const r of this.runes) r.tick();
  }

  /** Реген от руны Жизнь (вызывается в начале хода). Возвращает HP. */
  applyLifeRegen(): number {
    const life = this.getRune("life");
    if (!life || life.lifeRegenStacks <= 0) return 0;
    const heal2 = life.tickRegen();
    if (heal2 > 0) {
      return this.heal(heal2);
    }
    return 0;
  }

  /** Сохранить щит для перехода между боями (руна Страж). Вызывается при победе. */
  preserveShieldOnVictory(): void {
    const guardian = this.getRune("guardian");
    if (guardian) {
      this.carriedShield = Math.floor(this.shield * guardian.effectivePower);
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
