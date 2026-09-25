// RUNE WARS — базовые типы

export type GemColor = 0 | 1 | 2 | 3;
// 0 = red (атака), 1 = blue (щит), 2 = green (лечение), 3 = yellow (ярость)

export type GemState =
  | "idle"
  | "selected"
  | "swapping"
  | "matched"
  | "removing"
  | "falling"
  | "spawning";

export interface Gem {
  id: number;
  color: GemColor;
  row: number; // логическая позиция (целевая)
  col: number;
  // визуальная позиция (для анимации)
  px: number;
  py: number;
  targetPx: number;
  targetPy: number;
  scale: number;
  targetScale: number;
  alpha: number;
  targetAlpha: number;
  state: GemState;
  // таймер для пульсации выбора
  pulse: number;
  // немного случайного поворота для живости
  rot: number;
}

export type BoardPhase =
  | "idle"
  | "swapping"
  | "swapBack"
  | "checking"
  | "removing"
  | "falling"
  | "settling";

export interface MatchGroup {
  color: GemColor;
  cells: { row: number; col: number }[];
  length: number;
  // ось: 'h' (горизонталь) или 'v' (вертикаль)
  axis: "h" | "v";
}

export interface CascadeStats {
  cascadeCount: number; // сколько каскадов в этой цепочке
  matchesThisTurn: MatchGroup[];
  totalRemoved: number;
}
