// RUNE WARS — герой (HP/щит/ярость/уровень)

import type { HeroDef } from "../content/heroes";
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

  /** Готов ли ярость-удар (×2 к красной атаке). */
  canRageStrike(): boolean {
    return this.rage >= 30 && this.rageStrikeCooldown <= 0;
  }

  /** Совершить ярость-удар: сбросить ярость до 0 (с reserve) и поставить кулдаун 3 хода. */
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

  /** Тик пер-ходовых кулдаунов (вызывается в конце хода). */
  tickCooldowns(): void {
    if (this.rageStrikeCooldown > 0) this.rageStrikeCooldown--;
  }
}
