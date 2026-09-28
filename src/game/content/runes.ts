// RUNE WARS — руны: 9 рун с механиками

export type RuneId =
  | "fire"
  | "ice"
  | "life"
  | "wrath"
  | "chaos"
  | "smith"
  | "vampire"
  | "guardian"
  | "sage";

export type RuneRarity = "common" | "rare" | "epic";

export interface RuneDef {
  id: RuneId;
  name: string;
  title: string;
  description: string;
  rarity: RuneRarity;
  color: number; // 0-3, связанный цвет кристалла (для темы иконки)
  // множитель эффекта (растёт при апгрейде)
  power: number;
  maxLevel: number;
}

export const RUNES: RuneDef[] = [
  {
    id: "fire",
    name: "Огонь",
    title: "Пламя рун",
    description: "+50% к урону красных матчей длины 3-4 (не на 5+). 1 раз за ход.",
    rarity: "common",
    color: 0,
    power: 1.5,
    maxLevel: 3,
  },
  {
    id: "ice",
    name: "Лёд",
    title: "Зимняя стужа",
    description: "Синий матч 4+ замораживает врага на 1 ход (пропуск атаки). Перезарядка 2 хода.",
    rarity: "rare",
    color: 1,
    power: 1.0,
    maxLevel: 3,
  },
  {
    id: "life",
    name: "Жизнь",
    title: "Древо жизни",
    description: "Зелёный матч лечит вдвойне. Дополнительно реген 3 хода по 2 HP.",
    rarity: "rare",
    color: 2,
    power: 2.0,
    maxLevel: 3,
  },
  {
    id: "wrath",
    name: "Гнев",
    title: "Ярость богов",
    description: "Ярость копится ×2. Ульта (×3 вместо ×2) при ярости 30+.",
    rarity: "epic",
    color: 3,
    power: 2.0,
    maxLevel: 3,
  },
  {
    id: "chaos",
    name: "Хаос",
    title: "Слепой случай",
    description: "Каждый 5-й обмен меняет цвета двух случайных кристаллов.",
    rarity: "rare",
    color: 3,
    power: 1.0,
    maxLevel: 3,
  },
  {
    id: "smith",
    name: "Кузнец",
    title: "Молот рун",
    description: "Красный матч 5+ создаёт бомбу (взрыв 3×3 — бонус-эффекты). Макс 1 бомба за ход.",
    rarity: "epic",
    color: 0,
    power: 1.0,
    maxLevel: 3,
  },
  {
    id: "vampire",
    name: "Вампир",
    title: "Кровавый пир",
    description: "20% урона красными переходит в HP. Максимум +5 HP за ход.",
    rarity: "rare",
    color: 0,
    power: 0.2,
    maxLevel: 3,
  },
  {
    id: "guardian",
    name: "Страж",
    title: "Щит вечности",
    description: "50% щита сохраняется после боя (переходит в следующий).",
    rarity: "common",
    color: 1,
    power: 0.5,
    maxLevel: 3,
  },
  {
    id: "sage",
    name: "Мудрец",
    title: "Знание рун",
    description: "+1 к длине цепочки (3→4, 4→5) для расчёта множителя.",
    rarity: "epic",
    color: 2,
    power: 1.0,
    maxLevel: 3,
  },
];

export function getRune(id: RuneId): RuneDef {
  return RUNES.find((r) => r.id === id) ?? RUNES[0];
}

export const RARITY_COLOR: Record<RuneRarity, { border: string; glow: string; label: string }> = {
  common: { border: "#6a6a7a", glow: "rgba(160,160,180,0.4)", label: "Обычная" },
  rare: { border: "#3b7be2", glow: "rgba(59,123,226,0.5)", label: "Редкая" },
  epic: { border: "#aa44ff", glow: "rgba(170,68,255,0.55)", label: "Эпическая" },
};
