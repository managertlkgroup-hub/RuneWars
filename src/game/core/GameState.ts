// RUNE WARS — Zustand store для UI-состояния и меты

import { create } from "zustand";

export type ScreenName =
  | "loading"
  | "menu"
  | "battle"
  | "map"
  | "reward"
  | "victory"
  | "defeat"
  | "camp";

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
  combo: number; // текущий каскад
  maxCombo: number;
  totalMatches: number;
  lastMatchSummary: MatchSummary | null;
  hint: string;
  debugReady: boolean; // индикатор Game Ready (зелёный 90 сек)
  debugReadyTimer: number;

  setScreen: (s: ScreenName) => void;
  addScore: (n: number) => void;
  setCombo: (n: number) => void;
  bumpMaxCombo: (n: number) => void;
  incMatches: (n?: number) => void;
  setLastMatchSummary: (m: MatchSummary | null) => void;
  setHint: (s: string) => void;
  setDebugReady: (v: boolean) => void;
  setDebugReadyTimer: (n: number) => void;
  resetRun: () => void;
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
  debugReadyTimer: 0,

  setScreen: (screen) => set({ screen }),
  addScore: (n) => set((s) => ({ score: s.score + n })),
  setCombo: (combo) => set({ combo }),
  bumpMaxCombo: (n) => set((s) => ({ maxCombo: Math.max(s.maxCombo, n) })),
  incMatches: (n = 1) => set((s) => ({ totalMatches: s.totalMatches + n })),
  setLastMatchSummary: (lastMatchSummary) => set({ lastMatchSummary }),
  setHint: (hint) => set({ hint }),
  setDebugReady: (debugReady) => set({ debugReady }),
  setDebugReadyTimer: (debugReadyTimer) => set({ debugReadyTimer }),
  resetRun: () =>
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      totalMatches: 0,
      lastMatchSummary: null,
    }),
}));
