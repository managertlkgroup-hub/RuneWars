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
  ownedRunes: { id: string; level: number; copies: number; rarity: string }[];
  equippedRunes: string[];
  inventory: { uid: string; category: string; subType: string; name: string; rarity: string; baseValue: number; description: string; bonus: Record<string, unknown> }[];
  equippedItems: { weapon: unknown; armor: unknown; amulet: unknown };
  settings: { sound: boolean; music: boolean };
  // статистика
  stats: {
    totalRuns: number;
    wins: number;
    deaths: number;
    enemiesKilled: number;
    playTimeSec: number;
    maxDungeonUnlocked: number;
    dungeonRuns: Record<number, number>;
  };
  // Дейли-награда (retention для Яндекс.Игр)
  dailyReward: {
    lastClaimTs: number; // timestamp последнего клейма (0 = никогда)
    streak: number; // текущий стрик (дней подряд)
    totalClaimed: number; // всего клеймов за всё время
  };
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
  stats: {
    totalRuns: 0,
    wins: 0,
    deaths: 0,
    enemiesKilled: 0,
    playTimeSec: 0,
    maxDungeonUnlocked: 1,
    dungeonRuns: {},
  },
  dailyReward: {
    lastClaimTs: 0,
    streak: 0,
    totalClaimed: 0,
  },
};

export function loadMeta(): Partial<MetaState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT, ...parsed };
    // миграция: добавить copies=1 если отсутствует (старый формат)
    if (merged.ownedRunes) {
      merged.ownedRunes = merged.ownedRunes.map((r: { id: string; level: number; copies?: number; rarity: string }) => ({
        ...r,
        copies: r.copies ?? 1,
      }));
    }
    // миграция: добавить dailyReward если отсутствует (старый формат)
    if (!merged.dailyReward) {
      merged.dailyReward = { ...DEFAULT.dailyReward };
    }
    return merged;
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
