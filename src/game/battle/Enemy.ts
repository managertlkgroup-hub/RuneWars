// RUNE WARS — враг

import type { EnemyDef } from "../content/enemies";

export class Enemy {
  def: EnemyDef;
  maxHp: number;
  hp: number;
  // отсчёт до следующей атаки (в ходах игрока)
  attackCountdown: number;
  // состояние механик
  resurrected: boolean = false;
  splitUsed: boolean = false;

  constructor(def: EnemyDef) {
    this.def = def;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.attackCountdown = def.attackInterval;
  }

  takeDamage(amount: number): number {
    const before = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    return before - this.hp;
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  get hpPercent() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  /** Тик: возвращает true если сейчас ход атаки врага. */
  tickAttack(): boolean {
    this.attackCountdown--;
    if (this.attackCountdown <= 0) {
      this.attackCountdown = this.def.attackInterval;
      return true;
    }
    return false;
  }

  /** Особые механики (упрощённо для этапа 2). */
  get hasResurrect(): boolean {
    return this.def.trait === "resurrect" && !this.resurrected;
  }
  get hasSplit(): boolean {
    return this.def.trait === "split" && !this.splitUsed;
  }
  get hasDodge(): boolean {
    return this.def.trait === "dodge";
  }
  get hasShieldbreak(): boolean {
    return this.def.trait === "shieldbreak";
  }
}
