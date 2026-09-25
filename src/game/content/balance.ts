// RUNE WARS — баланс игры

import type { GemColor } from "../battle/types";

export const BOARD_SIZE = 7;
export const GEM_COLORS = 4;

// Длительности анимаций (сек)
export const ANIM = {
  swap: 0.2,
  remove: 0.28,
  fall: 0.32,
  fallMinSpeed: 380, // px/sec минимальная скорость падения
  fallMaxSpeed: 1100, // px/sec максимальная скорость падения
  fallGravity: 2400, // ускорение px/sec^2
  spawnOffset: -1, // множитель высоты спавна над доской
  selectPulse: 0.18, // период пульсации
};

// Множители по длине цепочки
export function lengthMultiplier(len: number): number {
  if (len <= 3) return 1.0;
  if (len === 4) return 1.5;
  if (len === 5) return 2.0;
  if (len === 6) return 2.5;
  return 3.0; // 7+
}

// Бонус за каскад: +25% за каждый уровень, максимум +100%, максимум 6 подряд
export const CASCADE_BONUS_PER = 0.25;
export const CASCADE_BONUS_MAX = 1.0;
export const CASCADE_MAX = 6;

export function cascadeBonus(cascadeLevel: number): number {
  // cascadeLevel 0 = первый матч, 1 = второй (первый каскад), ...
  if (cascadeLevel <= 0) return 0;
  return Math.min(cascadeLevel * CASCADE_BONUS_PER, CASCADE_BONUS_MAX);
}

// Базовые значения для кристаллов по длине
export const GEM_BASE = {
  damage: [0, 0, 0, 8, 12, 16, 20, 24], // индекс = длина; [3]=8, [4]=12, ...
  shield: [0, 0, 0, 5, 7, 10, 12, 15],
  heal: [0, 0, 0, 4, 6, 8, 10, 12],
  rage: [0, 0, 0, 8, 12, 16, 20, 24],
};

export function baseValue(kind: "damage" | "shield" | "heal" | "rage", length: number): number {
  const arr = GEM_BASE[kind];
  const idx = Math.min(length, arr.length - 1);
  return arr[idx];
}

// Ограничения (анти-имба)
export const CAPS = {
  damagePerTurn: 50,
  shieldPerTurn: 30,
  shieldMax: 50,
  healPerTurn: 20,
  ragePerTurn: 40,
  rageMax: 60,
  rageStrikeCooldownTurns: 3,
  runePerTurn: 1,
};

// Цвета кристаллов (для рендера)
export const GEM_COLOR_HEX: Record<
  GemColor,
  { base: string; light: string; dark: string; glow: string; name: string }
> = {
  0: { base: "#e23b3b", light: "#ff7070", dark: "#8b1a1a", glow: "rgba(226,59,59,0.55)", name: "Ruby" },
  1: { base: "#3b7be2", light: "#7fb0ff", dark: "#1a4a8b", glow: "rgba(59,123,226,0.55)", name: "Sapphire" },
  2: { base: "#3be26a", light: "#7fff9f", dark: "#1a8b3a", glow: "rgba(59,226,106,0.55)", name: "Emerald" },
  3: { base: "#e2c93b", light: "#fff07f", dark: "#8b7a1a", glow: "rgba(226,201,59,0.55)", name: "Topaz" },
};
