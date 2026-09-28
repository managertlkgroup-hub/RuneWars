// RUNE WARS — 6 героев с уникальными механиками

export type HeroMechanicId =
  | "warrior"
  | "mage"
  | "priestess"
  | "rogue"
  | "paladin"
  | "necromancer";

export interface HeroDef {
  id: HeroMechanicId;
  name: string;
  title: string;
  baseHp: number;
  mechanicId: HeroMechanicId;
  // пассивка цвета (для совместимости со старым кодом)
  favoredColor: 0 | 1 | 2 | 3;
  favoredBonus: number;
  palette: { body: string; accent: string; eye: string; cape: string };
  description: string;
  mechanicDesc: string;
  unlockCost: number; // 0 = стартовый
}

export const HEROES: HeroDef[] = [
  {
    id: "warrior",
    name: "Арик",
    title: "Воин",
    baseHp: 100,
    mechanicId: "warrior",
    favoredColor: 0,
    favoredBonus: 1.25,
    palette: { body: "#8a8a9a", accent: "#c9a227", eye: "#ffcc44", cape: "#8b1a1a" },
    description: "Стальной воин. Красные матчи +25% урона.",
    mechanicDesc: "Красный=атака, Синий=щит. Ульта: ярость-удар ×2.",
    unlockCost: 0,
  },
  {
    id: "mage",
    name: "Эльда",
    title: "Маг",
    baseHp: 80,
    mechanicId: "mage",
    favoredColor: 1,
    favoredBonus: 1.3,
    palette: { body: "#3a4a8a", accent: "#7faaff", eye: "#aaddff", cape: "#1a2a5a" },
    description: "Тайный маг. Хрупкий (80 HP).",
    mechanicDesc: "Синий=урон (базовый 8), Красный=замедление врага (задержка атаки на 1 ход).",
    unlockCost: 1500,
  },
  {
    id: "priestess",
    name: "Сера",
    title: "Жрица",
    baseHp: 90,
    mechanicId: "priestess",
    favoredColor: 2,
    favoredBonus: 1.35,
    palette: { body: "#d8c8a8", accent: "#3be26a", eye: "#aaffcc", cape: "#2a6a3a" },
    description: "Целительница. Зелёные матчи +35%.",
    mechanicDesc: "Зелёный=лечение+щит (комбо), Красный=слабый урон (8→5). Ульта: массовое лечение.",
    unlockCost: 2500,
  },
  {
    id: "rogue",
    name: "Векс",
    title: "Разбойник",
    baseHp: 90,
    mechanicId: "rogue",
    favoredColor: 3,
    favoredBonus: 1.3,
    palette: { body: "#3a2a4a", accent: "#c9a227", eye: "#ffdd44", cape: "#1a0a2a" },
    description: "Тень. Хрупкий (90 HP), но критический.",
    mechanicDesc: "Жёлтый=крит-урон (×2 при 50% шансе), Синий=уклонение. Ульта: серия критов.",
    unlockCost: 4000,
  },
  {
    id: "paladin",
    name: "Гарен",
    title: "Паладин",
    baseHp: 120,
    mechanicId: "paladin",
    favoredColor: 0,
    favoredBonus: 1.15,
    palette: { body: "#d8d8e8", accent: "#c9a227", eye: "#ffeebb", cape: "#8b1a1a" },
    description: "Защитник света. Стойкий (120 HP).",
    mechanicDesc: "Красный=атака+щит (5 урона + 3 щита). Медленный, но стойкий.",
    unlockCost: 6000,
  },
  {
    id: "necromancer",
    name: "Морт",
    title: "Некромант",
    baseHp: 75,
    mechanicId: "necromancer",
    favoredColor: 2,
    favoredBonus: 1.2,
    palette: { body: "#2a1a3a", accent: "#aa44ff", eye: "#cc88ff", cape: "#1a0a1a" },
    description: "Повелитель костей. Хрупкий (75 HP), но растёт в силе.",
    mechanicDesc: "Убийство врага даёт +10% урона на забег. Ульта: призыв скелета (3 хода по 5 урона).",
    unlockCost: 10000,
  },
];

export function getHero(id: HeroMechanicId): HeroDef {
  return HEROES.find((h) => h.id === id) ?? HEROES[0];
}
