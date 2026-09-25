// RUNE WARS — runtime-состояние руны (кулдауны, использование)

import type { RuneDef, RuneId } from "../content/runes";

export class RuneState {
  def: RuneDef;
  level: number; // 1..maxLevel (улучшения)
  cooldown: number = 0; // ходов до перезарядки
  usedThisTurn: boolean = false; // лимит 1 раз/ход
  // для Хаоса: счётчик обменов
  chaosSwapCount: number = 0;
  // для Кузнеца: бомбы за ход
  bombsThisTurn: number = 0;
  // для Жизни: стеки регена
  lifeRegenStacks: number = 0;
  // для ЛЁД: заморожен ли враг
  iceFrozen: boolean = false;

  constructor(def: RuneDef, level = 1) {
    this.def = def;
    this.level = level;
  }

  get id(): RuneId {
    return this.def.id;
  }

  /** Эффективная сила с учётом уровня (×1, ×1.1, ×1.2). */
  get effectivePower(): number {
    return this.def.power * (1 + (this.level - 1) * 0.15);
  }

  canUse(): boolean {
    if (this.usedThisTurn) return false;
    if (this.cooldown > 0) return false;
    return true;
  }

  markUsed(): void {
    this.usedThisTurn = true;
  }

  setCooldown(turns: number): void {
    this.cooldown = turns;
  }

  /** Тик пер-ходовых кулдаунов (в конце хода). */
  tick(): void {
    this.usedThisTurn = false;
    if (this.cooldown > 0) this.cooldown--;
    this.bombsThisTurn = 0;
  }

  /** Сброс регена (когда стеки кончились). */
  tickRegen(): number {
    if (this.lifeRegenStacks > 0) {
      this.lifeRegenStacks--;
      return 2; // 2 HP за ход
    }
    return 0;
  }
}
