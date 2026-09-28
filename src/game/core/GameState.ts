// RUNE WARS — Zustand store для UI-состояния и меты

import { create } from "zustand";
import type { RuneId, RuneRarity } from "../content/runes";
import type { DungeonMap, NodeType } from "../map/MapGenerator";
import type { Item, ItemCategory, ChestType } from "../content/items";
import { loadMeta, saveMeta, type MetaState } from "./storage";

export type ScreenName =
  | "loading"
  | "menu"
  | "map"
  | "battle"
  | "reward"
  | "equip"
  | "inventory"
  | "heroSelect"
  | "perkSelect"
  | "camp"
  | "nodeAction"
  | "victory"
  | "defeat";

export interface OwnedRune {
  id: RuneId;
  level: number; // 1..3
  rarity: RuneRarity;
}

export interface MatchSummary {
  color: number;
  length: number;
  damage: number;
  shield: number;
  heal: number;
  rage: number;
  cascadeLevel: number;
}

export interface PendingBattle {
  floor: number;
  isBoss: boolean;
  nodeType: NodeType;
  nodeId: number;
  dungeonId: number;
}

interface GameUIState {
  screen: ScreenName;
  score: number;
  combo: number;
  maxCombo: number;
  totalMatches: number;
  lastMatchSummary: MatchSummary | null;
  hint: string;
  debugReady: boolean;

  // мета-прогрессия
  gold: number; // золото аккаунта
  ownedRunes: OwnedRune[];
  equippedRunes: RuneId[];
  lastRewardRunes: RuneId[];

  // карта подземелья
  currentMap: DungeonMap | null;
  currentDungeonId: number;
  pendingBattle: PendingBattle | null;
  lastNodeReward: { kind: string; amount?: number; label?: string } | null;

  // инвентарь и экипировка
  inventory: Item[];
  equippedItems: { weapon: Item | null; armor: Item | null; amulet: Item | null };
  pityCounter: number;
  pendingChest: { chestType: ChestType; nodeId: number } | null;
  pendingDrop: Item | null;
  pendingPerkLevel: number | null; // уровень, на котором нужно выбрать перк

  // внутри-забежные бонусы (сбрасываются при новом забеге)
  dungeonGold: number;
  heroHp: number;
  heroMaxHp: number;
  runBonuses: {
    redDamageFlat?: number;
    maxHpBonus?: number;
    regenPerTurn?: number;
    startShield?: number;
    startRage?: number;
    keys?: number;
  };
  shopPurchases: Record<string, number>;

  // мета-прогрессия (персистентная, localStorage)
  accountGold: number; // золото аккаунта (между забегами)
  unlockedHeroes: string[];
  activeHero: string;
  heroLevels: Record<string, number>;
  heroXp: Record<string, number>;
  heroPerks: Record<string, number[]>; // выбранные индексы перков по [heroId-level]
  heroPrestige: Record<string, number>;
  campUpgrades: Record<string, number>;
  settings: { sound: boolean; music: boolean };

  setScreen: (s: ScreenName) => void;
  addScore: (n: number) => void;
  setCombo: (n: number) => void;
  bumpMaxCombo: (n: number) => void;
  incMatches: (n?: number) => void;
  setLastMatchSummary: (m: MatchSummary | null) => void;
  setHint: (s: string) => void;
  setDebugReady: (v: boolean) => void;

  addGold: (n: number) => void;
  addOwnedRune: (r: OwnedRune) => void;
  upgradeRune: (id: RuneId) => void;
  setEquippedRunes: (ids: RuneId[]) => void;
  setLastRewardRunes: (ids: RuneId[]) => void;

  setMap: (m: DungeonMap) => void;
  setDungeonId: (id: number) => void;
  setPendingBattle: (p: PendingBattle | null) => void;
  setLastNodeReward: (r: GameUIState["lastNodeReward"]) => void;

  addItem: (it: Item) => void;
  equipItem: (it: Item) => void;
  unequipSlot: (cat: ItemCategory) => void;
  setPityCounter: (n: number) => void;
  setPendingChest: (c: GameUIState["pendingChest"]) => void;
  setPendingDrop: (d: Item | null) => void;
  setPendingPerkLevel: (l: number | null) => void;

  addDungeonGold: (n: number) => void;
  setDungeonGold: (n: number) => void;
  setHeroHp: (n: number) => void;
  setHeroMaxHp: (n: number) => void;
  applyRunBonus: (b: Partial<GameUIState["runBonuses"]>) => void;
  setRunBonuses: (b: GameUIState["runBonuses"]) => void;
  incShopPurchase: (id: string) => void;

  resetRun: () => void;
  resetDungeonRun: () => void;
  resetAll: () => void;

  // мета-прогрессия (персистентная)
  saveMeta: () => void;
  unlockHero: (id: string, cost: number) => boolean;
  setActiveHero: (id: string) => void;
  addHeroXp: (heroId: string, xp: number) => { leveledUp: boolean; newLevel: number; perksToChoose: number[] };
  choosePerk: (heroId: string, level: number, perkIdx: number) => void;
  prestigeHero: (heroId: string) => void;
  buyCampUpgrade: (id: string, cost: number) => boolean;
  setSettings: (s: Partial<MetaState["settings"]>) => void;
}

// загрузка мета-прогрессии (один раз)
const _meta = typeof window !== "undefined" ? loadMeta() : {};

export const useGameStore = create<GameUIState>((set) => ({
  screen: "loading",
  score: 0,
  combo: 0,
  maxCombo: 0,
  totalMatches: 0,
  lastMatchSummary: null,
  hint: "Собирай 3+ кристалла в линию",
  debugReady: false,

  gold: 0,
  ownedRunes: [],
  equippedRunes: [],
  lastRewardRunes: [],
  currentMap: null,
  currentDungeonId: 1,
  pendingBattle: null,
  lastNodeReward: null,
  inventory: [],
  equippedItems: { weapon: null, armor: null, amulet: null },
  pityCounter: _meta.pityCounter ?? 0,
  pendingChest: null,
  pendingDrop: null,
  pendingPerkLevel: null,
  dungeonGold: 0,
  heroHp: 100,
  heroMaxHp: 100,
  runBonuses: {},
  shopPurchases: {},
  // мета-прогрессия
  accountGold: _meta.accountGold ?? 0,
  unlockedHeroes: _meta.unlockedHeroes ?? ["warrior"],
  activeHero: _meta.activeHero ?? "warrior",
  heroLevels: _meta.heroLevels ?? { warrior: 1 },
  heroXp: _meta.heroXp ?? { warrior: 0 },
  heroPerks: _meta.heroPerks ?? {},
  heroPrestige: _meta.heroPrestige ?? {},
  campUpgrades: _meta.campUpgrades ?? {},
  settings: _meta.settings ?? { sound: true, music: true },

  setScreen: (screen) => set({ screen }),
  addScore: (n) => set((s) => ({ score: s.score + n })),
  setCombo: (combo) => set({ combo }),
  bumpMaxCombo: (n) => set((s) => ({ maxCombo: Math.max(s.maxCombo, n) })),
  incMatches: (n = 1) => set((s) => ({ totalMatches: s.totalMatches + n })),
  setLastMatchSummary: (lastMatchSummary) => set({ lastMatchSummary }),
  setHint: (hint) => set({ hint }),
  setDebugReady: (debugReady) => set({ debugReady }),

  addGold: (gold) => {
    set((s) => ({ accountGold: s.accountGold + gold }));
    useGameStore.getState().saveMeta();
  },
  addOwnedRune: (r) =>
    set((s) => {
      const existing = s.ownedRunes.find((x) => x.id === r.id);
      if (existing) {
        // если уже есть — повышаем уровень (до 3)
        if (existing.level < 3) existing.level++;
        return { ownedRunes: [...s.ownedRunes] };
      }
      return { ownedRunes: [...s.ownedRunes, r] };
    }),
  upgradeRune: (id) =>
    set((s) => ({
      ownedRunes: s.ownedRunes.map((r) =>
        r.id === id && r.level < 3 ? { ...r, level: r.level + 1 } : r
      ),
    })),
  setEquippedRunes: (equippedRunes) => set({ equippedRunes: equippedRunes.slice(0, 3) }),
  setLastRewardRunes: (lastRewardRunes) => set({ lastRewardRunes }),

  setMap: (currentMap) => set({ currentMap }),
  setDungeonId: (currentDungeonId) => set({ currentDungeonId }),
  setPendingBattle: (pendingBattle) => set({ pendingBattle }),
  setLastNodeReward: (lastNodeReward) => set({ lastNodeReward }),

  addItem: (it) => set((s) => ({ inventory: [...s.inventory, it] })),
  equipItem: (it) =>
    set((s) => {
      const eq = { ...s.equippedItems };
      // вернуть текущий экипированный в инвентарь
      const cur = eq[it.category];
      const inv = [...s.inventory];
      if (cur) inv.push(cur);
      // убрать новый из инвентаря
      const idx = inv.findIndex((x) => x.uid === it.uid);
      if (idx >= 0) inv.splice(idx, 1);
      eq[it.category] = it;
      return { equippedItems: eq, inventory: inv };
    }),
  unequipSlot: (cat) =>
    set((s) => {
      const eq = { ...s.equippedItems };
      const cur = eq[cat];
      const inv = [...s.inventory];
      if (cur) inv.push(cur);
      eq[cat] = null;
      return { equippedItems: eq, inventory: inv };
    }),
  setPityCounter: (pityCounter) => set({ pityCounter }),
  setPendingChest: (pendingChest) => set({ pendingChest }),
  setPendingDrop: (pendingDrop) => set({ pendingDrop }),
  setPendingPerkLevel: (pendingPerkLevel) => set({ pendingPerkLevel }),

  addDungeonGold: (n) => set((s) => ({ dungeonGold: Math.max(0, s.dungeonGold + n) })),
  setDungeonGold: (dungeonGold) => set({ dungeonGold: Math.max(0, dungeonGold) }),
  setHeroHp: (heroHp) => set({ heroHp: Math.max(0, Math.round(heroHp)) }),
  setHeroMaxHp: (heroMaxHp) => set({ heroMaxHp }),
  applyRunBonus: (b) =>
    set((s) => ({
      runBonuses: {
        ...s.runBonuses,
        redDamageFlat: (s.runBonuses.redDamageFlat ?? 0) + (b.redDamageFlat ?? 0),
        maxHpBonus: (s.runBonuses.maxHpBonus ?? 0) + (b.maxHpBonus ?? 0),
        regenPerTurn: (s.runBonuses.regenPerTurn ?? 0) + (b.regenPerTurn ?? 0),
        startShield: (s.runBonuses.startShield ?? 0) + (b.startShield ?? 0),
        startRage: (s.runBonuses.startRage ?? 0) + (b.startRage ?? 0),
        keys: (s.runBonuses.keys ?? 0) + (b.keys ?? 0),
      },
    })),
  setRunBonuses: (runBonuses) => set({ runBonuses }),
  incShopPurchase: (id) =>
    set((s) => ({ shopPurchases: { ...s.shopPurchases, [id]: (s.shopPurchases[id] ?? 0) + 1 } })),

  resetRun: () =>
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      totalMatches: 0,
      lastMatchSummary: null,
    }),
  resetDungeonRun: () =>
    set((s) => ({
      dungeonGold: 0,
      heroHp: s.heroMaxHp,
      runBonuses: {},
      shopPurchases: {},
    })),
  resetAll: () =>
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      totalMatches: 0,
      lastMatchSummary: null,
      gold: 0,
      ownedRunes: [],
      equippedRunes: [],
      lastRewardRunes: [],
      currentMap: null,
      pendingBattle: null,
      lastNodeReward: null,
      inventory: [],
      equippedItems: { weapon: null, armor: null, amulet: null },
      pityCounter: 0,
      pendingChest: null,
      pendingDrop: null,
      accountGold: 0,
      unlockedHeroes: ["warrior"],
      activeHero: "warrior",
      heroLevels: { warrior: 1 },
      heroXp: { warrior: 0 },
      heroPerks: {},
      heroPrestige: {},
      campUpgrades: {},
      settings: { sound: true, music: true },
    }),

  // --- мета-прогрессия ---

  saveMeta: () => {
    const s = useGameStore.getState();
    // сохранить в localStorage
    saveMeta({
      accountGold: s.accountGold,
      unlockedHeroes: s.unlockedHeroes,
      activeHero: s.activeHero,
      heroLevels: s.heroLevels,
      heroXp: s.heroXp,
      heroPerks: s.heroPerks,
      heroPrestige: s.heroPrestige,
      campUpgrades: s.campUpgrades,
      pityCounter: s.pityCounter,
      ownedRunes: s.ownedRunes,
      equippedRunes: s.equippedRunes,
      settings: s.settings,
    });
    // синхронизация с Yandex Player (throttled, no-op если SDK недоступен)
    if (typeof window !== "undefined") {
      import("./YandexSDK").then(({ getYandexSDK }) => {
        getYandexSDK().savePlayerData({
          accountGold: s.accountGold,
          unlockedHeroes: s.unlockedHeroes,
          activeHero: s.activeHero,
          heroLevels: s.heroLevels,
          heroXp: s.heroXp,
        });
      });
    }
  },

  unlockHero: (id, cost) => {
    let ok = false;
    set((s) => {
      if (s.unlockedHeroes.includes(id)) return {};
      if (s.accountGold < cost) return {};
      ok = true;
      return {
        accountGold: s.accountGold - cost,
        unlockedHeroes: [...s.unlockedHeroes, id],
        heroLevels: { ...s.heroLevels, [id]: s.heroLevels[id] ?? 1 },
        heroXp: { ...s.heroXp, [id]: s.heroXp[id] ?? 0 },
      };
    });
    if (ok) useGameStore.getState().saveMeta();
    return ok;
  },

  setActiveHero: (id) => {
    set({ activeHero: id });
    useGameStore.getState().saveMeta();
  },

  addHeroXp: (heroId, xp) => {
    const s = useGameStore.getState();
    let level = s.heroLevels[heroId] ?? 1;
    let curXp = s.heroXp[heroId] ?? 0;
    curXp += xp;
    const perksToChoose: number[] = [];
    let leveledUp = false;
    // формула: для уровня N нужно 100 + N*50 XP
    while (level < 30) {
      const need = 100 + level * 50;
      if (curXp >= need) {
        curXp -= need;
        level++;
        leveledUp = true;
        if (level % 5 === 0) perksToChoose.push(level);
      } else break;
    }
    if (leveledUp) {
      set({
        heroLevels: { ...s.heroLevels, [heroId]: level },
        heroXp: { ...s.heroXp, [heroId]: curXp },
      });
      useGameStore.getState().saveMeta();
    } else {
      set({ heroXp: { ...s.heroXp, [heroId]: curXp } });
    }
    return { leveledUp, newLevel: level, perksToChoose };
  },

  choosePerk: (heroId, level, perkIdx) => {
    const s = useGameStore.getState();
    const key = `${heroId}-${level}`;
    const existing = s.heroPerks[key] ?? [];
    if (existing.includes(perkIdx)) return;
    set({ heroPerks: { ...s.heroPerks, [key]: [...existing, perkIdx] } });
    useGameStore.getState().saveMeta();
  },

  prestigeHero: (heroId) => {
    const s = useGameStore.getState();
    const level = s.heroLevels[heroId] ?? 1;
    if (level < 30) return;
    const prestige = s.heroPrestige[heroId] ?? 0;
    if (prestige >= 5) return;
    set({
      heroLevels: { ...s.heroLevels, [heroId]: 1 },
      heroXp: { ...s.heroXp, [heroId]: 0 },
      heroPrestige: { ...s.heroPrestige, [heroId]: prestige + 1 },
    });
    useGameStore.getState().saveMeta();
  },

  buyCampUpgrade: (id, cost) => {
    let ok = false;
    set((s) => {
      if (s.accountGold < cost) return {};
      ok = true;
      return {
        accountGold: s.accountGold - cost,
        campUpgrades: { ...s.campUpgrades, [id]: (s.campUpgrades[id] ?? 0) + 1 },
      };
    });
    if (ok) useGameStore.getState().saveMeta();
    return ok;
  },

  setSettings: (ns) => {
    set((s) => ({ settings: { ...s.settings, ...ns } }));
    useGameStore.getState().saveMeta();
  },
}));
