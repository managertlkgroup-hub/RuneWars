// RUNE WARS — Zustand store для UI-состояния и меты

import { create } from "zustand";
import type { RuneId, RuneRarity } from "../content/runes";

export type ScreenName =
  | "loading"
  | "menu"
  | "battle"
  | "reward"
  | "equip"
  | "map"
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
  ownedRunes: OwnedRune[]; // инвентарь рун
  equippedRunes: RuneId[]; // до 3 экипированных
  lastRewardRunes: RuneId[]; // руны, доступные для выбора в награде

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
    }),
}));
