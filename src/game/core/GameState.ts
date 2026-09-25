// RUNE WARS — Zustand store для UI-состояния и меты

import { create } from "zustand";
import type { RuneId, RuneRarity } from "../content/runes";
import type { DungeonMap, NodeType } from "../map/MapGenerator";
import type { Item, ItemCategory, ChestType } from "../content/items";

export type ScreenName =
  | "loading"
  | "menu"
  | "map"
  | "battle"
  | "reward"
  | "equip"
  | "inventory"
  | "nodeAction"
  | "victory"
  | "defeat"
  | "camp";

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
  pendingDrop: Item | null; // дроп с элиты/босса

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

  resetRun: () => void;
  resetAll: () => void;
}

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
  pityCounter: 0,
  pendingChest: null,
  pendingDrop: null,

  setScreen: (screen) => set({ screen }),
  addScore: (n) => set((s) => ({ score: s.score + n })),
  setCombo: (combo) => set({ combo }),
  bumpMaxCombo: (n) => set((s) => ({ maxCombo: Math.max(s.maxCombo, n) })),
  incMatches: (n = 1) => set((s) => ({ totalMatches: s.totalMatches + n })),
  setLastMatchSummary: (lastMatchSummary) => set({ lastMatchSummary }),
  setHint: (hint) => set({ hint }),
  setDebugReady: (debugReady) => set({ debugReady }),

  addGold: (gold) => set((s) => ({ gold: s.gold + gold })),
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

  resetRun: () =>
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      totalMatches: 0,
      lastMatchSummary: null,
    }),
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
    }),
}));
