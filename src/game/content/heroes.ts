// RUNE WARS — контент: герои

export type HeroArchetype =
  | "warrior"
  | "mage"
  | "priestess"
  | "rogue"
  | "paladin"
  | "necromancer";

export interface HeroDef {
  id: HeroArchetype;
  name: string;
  title: string;
  baseHp: number;
  // пассивка цвета: какой цвет даёт бонус (упрощённо для этапа 2)
  favoredColor: 0 | 1 | 2 | 3;
  favoredBonus: number; // множитель для любимого цвета
  palette: { body: string; accent: string; eye: string; cape: string };
  description: string;
  // открыто с какого уровня аккаунта (для этапа 7)
  unlockLevel: number;
}

export const HEROES: HeroDef[] = [
  {
    id: "warrior",
    name: "Арик",
    title: "Воин",
    baseHp: 100,
    favoredColor: 0, // красный — атака
    favoredBonus: 1.25,
    palette: { body: "#8a8a9a", accent: "#c9a227", eye: "#ffcc44", cape: "#8b1a1a" },
    description: "Стальной воин. Красные матчи наносят +25% урона.",
    unlockLevel: 1,
  },
  {
    id: "mage",
    name: "Эльда",
    title: "Маг",
    baseHp: 85,
    favoredColor: 1, // синий — щит
    favoredBonus: 1.3,
    palette: { body: "#3a4a8a", accent: "#7faaff", eye: "#aaddff", cape: "#1a2a5a" },
    description: "Тайный маг. Синие матчи дают +30% щита.",
    unlockLevel: 1,
  },
  {
    id: "priestess",
    name: "Сера",
    title: "Жрица",
    baseHp: 90,
    favoredColor: 2, // зелёный — лечение
    favoredBonus: 1.35,
    palette: { body: "#d8c8a8", accent: "#3be26a", eye: "#aaffcc", cape: "#2a6a3a" },
    description: "Целительница. Зелёные матчи лечат +35%.",
    unlockLevel: 5,
  },
  {
    id: "rogue",
    name: "Векс",
    title: "Разбойник",
    baseHp: 80,
    favoredColor: 3, // жёлтый — ярость
    favoredBonus: 1.3,
    palette: { body: "#3a2a4a", accent: "#c9a227", eye: "#ffdd44", cape: "#1a0a2a" },
    description: "Тень. Жёлтые матчи дают +30% ярости.",
    unlockLevel: 10,
  },
  {
    id: "paladin",
    name: "Гарен",
    title: "Паладин",
    baseHp: 110,
    favoredColor: 0,
    favoredBonus: 1.15,
    palette: { body: "#d8d8e8", accent: "#c9a227", eye: "#ffeebb", cape: "#8b1a1a" },
    description: "Защитник света. Больше HP, +15% к красным.",
    unlockLevel: 15,
  },
  {
    id: "necromancer",
    name: "Морт",
    title: "Некромант",
    baseHp: 75,
    favoredColor: 2,
    favoredBonus: 1.2,
    palette: { body: "#2a1a3a", accent: "#aa44ff", eye: "#cc88ff", cape: "#1a0a1a" },
    description: "Повелитель костей. Зелёные матчи лечат +20%, но мало HP.",
    unlockLevel: 20,
  },
];

export function getHero(id: HeroArchetype): HeroDef {
  return HEROES.find((h) => h.id === id) ?? HEROES[0];
}
