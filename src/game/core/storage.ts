// RUNE WARS — персистентность мета-прогрессии в localStorage

const KEY = "runeWars_meta_v1";

export interface MetaState {
  accountGold: number;
  unlockedHeroes: string[];
  activeHero: string;
  heroLevels: Record<string, number>;
  heroXp: Record<string, number>;
  heroPerks: Record<string, number[]>; // выбранные перки по уровням
  heroPrestige: Record<string, number>;
  campUpgrades: Record<string, number>; // id → уровень/количество
  pityCounter: number;
  ownedRunes: { id: string; level: number; rarity: string }[];
  equippedRunes: string[];
  inventory: { uid: string; category: string; subType: string; name: string; rarity: string; baseValue: number; description: string; bonus: Record<string, unknown> }[];
  equippedItems: { weapon: unknown; armor: unknown; amulet: unknown };
  settings: { sound: boolean; music: boolean };
}

const DEFAULT: MetaState = {
  accountGold: 0,
  unlockedHeroes: ["warrior"],
  activeHero: "warrior",
  heroLevels: { warrior: 1 },
  heroXp: { warrior: 0 },
  heroPerks: {},
  heroPrestige: {},
  campUpgrades: {},
  pityCounter: 0,
  ownedRunes: [],
  equippedRunes: [],
  inventory: [],
  equippedItems: { weapon: null, armor: null, amulet: null },
  settings: { sound: true, music: true },
};

export function loadMeta(): Partial<MetaState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch {
    return {};
  }
}

export function saveMeta(data: Partial<MetaState>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage может быть недоступен (приватный режим)
  }
}

export function clearMeta(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export const DEFAULT_META = DEFAULT;
