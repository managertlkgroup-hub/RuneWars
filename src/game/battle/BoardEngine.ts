// RUNE WARS — движок игрового поля (Match-3)
// Конечный автомат: idle -> swapping -> checking -> removing -> falling -> checking (каскад) -> idle

import type { Gem, GemColor, BoardPhase, MatchGroup } from "./types";
import { BOARD_SIZE, GEM_COLORS, ANIM, lengthMultiplier, cascadeBonus, CASCADE_MAX } from "../content/balance";
import { findAllMatches, cellsToRemove, hasAnyMatch, hasPossibleMove } from "./MatchLogic";

let nextGemId = 1;

export interface BoardMetrics {
  cellSize: number;
  originX: number;
  originY: number;
  boardW: number;
  boardH: number;
}

export interface SwapResult {
  swapped: boolean;
  matched: boolean;
}

export type BoardEvent =
  | { type: "match"; groups: MatchGroup[]; cascadeLevel: number }
  | { type: "swapFail"; row1: number; col1: number; row2: number; col2: number }
  | { type: "turnEnd"; totalRemoved: number; cascadeCount: number }
  | { type: "select"; row: number | null; col: number | null };

export type BoardEventListener = (e: BoardEvent) => void;

export class BoardEngine {
  grid: (Gem | null)[][] = [];
  phase: BoardPhase = "idle";
  selected: { row: number; col: number } | null = null;
  metrics: BoardMetrics;

  // таймеры фаз
  private phaseTimer = 0;
  private swapPair: { a: Gem; b: Gem; rollback: boolean } | null = null;
  private removeTimer = 0;
  private fallTimer = 0;

  // статистика текущего хода
  private cascadeLevel = 0;
  private matchesThisTurn: MatchGroup[] = [];
  private totalRemovedThisTurn = 0;

  // обработчик событий (например, для применения эффектов боя)
  listener: BoardEventListener | null = null;

  constructor(metrics: BoardMetrics) {
    this.metrics = metrics;
    this.generateBoard();
  }

  setMetrics(m: BoardMetrics) {
    this.metrics = m;
    // обновить целевые позиции всех гемов
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const g = this.grid[r][c];
        if (g) {
          const { x, y } = this.cellCenter(r, c);
          g.targetPx = x;
          g.targetPy = y;
          if (g.state === "idle") {
            g.px = x;
            g.py = y;
          }
        }
      }
    }
  }

  cellCenter(row: number, col: number) {
    const { cellSize, originX, originY } = this.metrics;
    return {
      x: originX + col * cellSize + cellSize / 2,
      y: originY + row * cellSize + cellSize / 2,
    };
  }

  /** Генерация доски без готовых линий. */
  generateBoard() {
    this.grid = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      this.grid[r] = [];
      for (let c = 0; c < BOARD_SIZE; c++) this.grid[r][c] = null;
    }
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const color = this.pickSafeColor(r, c);
        this.grid[r][c] = this.makeGem(color, r, c, false);
      }
    }
    // гарантия playable
    if (!hasPossibleMove(this.colorGrid())) {
      this.shuffleBoard();
    }
    this.phase = "idle";
    this.cascadeLevel = 0;
  }

  private colorGrid(): (GemColor | -1)[][] {
    const g: (GemColor | -1)[][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      g[r] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        g[r][c] = this.grid[r][c] ? this.grid[r][c]!.color : -1;
      }
    }
    return g;
  }

  private pickSafeColor(row: number, col: number): GemColor {
    const forbidden = new Set<GemColor>();
    // проверяем 2 влево и 2 вверх, чтобы не собрать 3 сразу
    if (col >= 2) {
      const a = this.grid[row][col - 1];
      const b = this.grid[row][col - 2];
      if (a && b && a.color === b.color) forbidden.add(a.color);
    }
    if (row >= 2) {
      const a = this.grid[row - 1][col];
      const b = this.grid[row - 2][col];
      if (a && b && a.color === b.color) forbidden.add(a.color);
    }
    const pool: GemColor[] = [];
    for (let i = 0; i < GEM_COLORS; i++) {
      if (!forbidden.has(i as GemColor)) pool.push(i as GemColor);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private makeGem(color: GemColor, row: number, col: number, fromAbove: boolean): Gem {
    const { x, y } = this.cellCenter(row, col);
    return {
      id: nextGemId++,
      color,
      row,
      col,
      px: x,
      py: fromAbove ? y - this.metrics.boardH : y,
      targetPx: x,
      targetPy: y,
      scale: fromAbove ? 0.6 : 1,
      targetScale: 1,
      alpha: 1,
      targetAlpha: 1,
      state: fromAbove ? "spawning" : "idle",
      pulse: 0,
      rot: (Math.random() - 0.5) * 0.06,
    };
  }

  private shuffleBoard() {
    // простой перемешиватель: пересоздаём пока не появится возможный ход
    let attempts = 0;
    do {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const color = Math.floor(Math.random() * GEM_COLORS) as GemColor;
          if (this.grid[r][c]) this.grid[r][c]!.color = color;
        }
      }
      attempts++;
    } while ((!hasPossibleMove(this.colorGrid()) || hasAnyMatch(this.colorGrid())) && attempts < 30);
  }

  /** Клик по клетке. Возвращает true если событие обработано (не в idle). */
  handleClick(px: number, py: number): boolean {
    if (this.phase !== "idle") return false;
    const { originX, originY, cellSize } = this.metrics;
    const col = Math.floor((px - originX) / cellSize);
    const row = Math.floor((py - originY) / cellSize);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
    return this.onCellClick(row, col);
  }

  private onCellClick(row: number, col: number): boolean {
    if (!this.selected) {
      this.selected = { row, col };
      const g = this.grid[row][col];
      if (g) g.state = "selected";
      this.emit({ type: "select", row, col });
      return true;
    }
    // клик по той же — снимаем выделение
    if (this.selected.row === row && this.selected.col === col) {
      const g = this.grid[row][col];
      if (g) g.state = "idle";
      this.selected = null;
      this.emit({ type: "select", row: null, col: null });
      return true;
    }
    // проверяем соседство
    const dr = Math.abs(row - this.selected.row);
    const dc = Math.abs(col - this.selected.col);
    if (dr + dc === 1) {
      // валидный обмен соседей
      this.startSwap(this.selected.row, this.selected.col, row, col);
      return true;
    }
    // не сосед — переподбираем выделение
    const prev = this.grid[this.selected.row][this.selected.col];
    if (prev) prev.state = "idle";
    this.selected = { row, col };
    const g = this.grid[row][col];
    if (g) g.state = "selected";
    this.emit({ type: "select", row, col });
    return true;
  }

  private startSwap(r1: number, c1: number, r2: number, c2: number) {
    const a = this.grid[r1][c1];
    const b = this.grid[r2][c2];
    if (!a || !b) return;
    // снимаем выделение визуально
    a.state = "swapping";
    b.state = "swapping";
    // меняем логические позиции сразу (визуально поедут к новым targetPx/Y)
    const { x: ax, y: ay } = this.cellCenter(r1, c1);
    const { x: bx, y: by } = this.cellCenter(r2, c2);
    a.targetPx = bx;
    a.targetPy = by;
    b.targetPx = ax;
    b.targetPy = ay;
    // меняем местами в сетке
    this.grid[r1][c1] = b;
    this.grid[r2][c2] = a;
    a.row = r2;
    a.col = c2;
    b.row = r1;
    b.col = c1;
    this.swapPair = { a, b, rollback: false };
    this.phase = "swapping";
    this.phaseTimer = 0;
    this.selected = null;
    this.emit({ type: "select", row: null, col: null });
  }

  private emit(e: BoardEvent) {
    if (this.listener) this.listener(e);
  }

  /** Главный апдейт. dt в секундах. */
  update(dt: number) {
    // обновляем визуальные позиции всех гемов (lerp к target)
    this.animateGems(dt);

    switch (this.phase) {
      case "idle":
        // пульсация выделенного
        if (this.selected) {
          const g = this.grid[this.selected.row][this.selected.col];
          if (g) g.pulse += dt;
        }
        break;
      case "swapping":
        this.phaseTimer += dt;
        if (this.phaseTimer >= ANIM.swap) {
          this.phaseTimer = 0;
          // обмен завершён визуально, проверяем матчи
          if (this.swapPair) {
            this.snapGemsToTarget();
            const grid = this.colorGrid();
            const matches = findAllMatches(grid);
            if (matches.length === 0) {
              // откат обмена
              const { a, b } = this.swapPair;
              this.rollbackSwap(a, b);
              this.swapPair!.rollback = true;
              this.phase = "swapping";
              this.phaseTimer = 0;
              this.emit({
                type: "swapFail",
                row1: a.row,
                col1: a.col,
                row2: b.row,
                col2: b.col,
              });
            } else {
              this.swapPair = null;
              this.startRemoval(matches);
            }
          } else {
            this.phase = "idle";
          }
        }
        break;
      case "checking":
        // мгновенная фаза
        {
          const grid = this.colorGrid();
          const matches = findAllMatches(grid);
          if (matches.length === 0) {
            this.endTurn();
          } else {
            this.startRemoval(matches);
          }
        }
        break;
      case "removing":
        this.removeTimer += dt;
        if (this.removeTimer >= ANIM.remove) {
          this.removeTimer = 0;
          // финальное удаление из сетки
          for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
              const g = this.grid[r][c];
              if (g && (g.state === "removing" || g.state === "matched")) {
                this.grid[r][c] = null;
              }
            }
          }
          this.applyGravityAndRefill();
          this.phase = "falling";
          this.fallTimer = 0;
        }
        break;
      case "falling":
        this.fallTimer += dt;
        // проверяем, все ли гемы достигли цели
        if (this.allSettled() || this.fallTimer >= ANIM.fall + 0.5) {
          this.snapGemsToTarget();
          // снимаем состояние spawning
          for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
              const g = this.grid[r][c];
              if (g && (g.state === "spawning" || g.state === "falling")) {
                g.state = "idle";
                g.scale = 1;
                g.targetScale = 1;
              }
            }
          }
          this.cascadeLevel++;
          if (this.cascadeLevel > CASCADE_MAX) {
            this.endTurn();
          } else {
            this.phase = "checking";
          }
        }
        break;
      case "settling":
        this.phase = "idle";
        break;
    }
  }

  private animateGems(dt: number) {
    // скорость lerp — зависит от фазы
    const lerpSwap = 1 - Math.pow(0.0001, dt / ANIM.swap);
    const lerpFall = Math.min(1, dt / 0.16); // быстрое падение
    const lerpScale = Math.min(1, dt / 0.1);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const g = this.grid[r][c];
        if (!g) continue;
        if (g.state === "swapping" || g.state === "spawning") {
          g.px += (g.targetPx - g.px) * lerpSwap;
          g.py += (g.targetPy - g.py) * lerpSwap;
        } else if (g.state === "falling" || g.state === "spawning") {
          g.px += (g.targetPx - g.px) * lerpSwap;
          // для падения используем гравитационную модель: ускорение
          const dy = g.targetPy - g.py;
          if (dy > 0.5) {
            // приближаемся к цели с ускорением
            const speed = Math.min(ANIM.fallMaxSpeed, ANIM.fallMinSpeed + (this.fallTimer + r) * 0);
            g.py += Math.min(dy, speed * dt);
          } else {
            g.py = g.targetPy;
          }
        } else if (g.state === "removing") {
          // scale и alpha убывают
          const t = this.removeTimer / ANIM.remove;
          g.scale = 1 - t;
          g.alpha = 1 - t;
        } else {
          // idle — подтягиваем к цели на всякий случай
          g.px += (g.targetPx - g.px) * lerpFall;
          g.py += (g.targetPy - g.py) * lerpFall;
        }
        // scale и alpha lerp
        g.scale += (g.targetScale - g.scale) * lerpScale;
        g.alpha += (g.targetAlpha - g.alpha) * lerpScale;
      }
    }
  }

  private snapGemsToTarget() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const g = this.grid[r][c];
        if (!g) continue;
        g.px = g.targetPx;
        g.py = g.targetPy;
      }
    }
  }

  private allSettled(): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const g = this.grid[r][c];
        if (!g) continue;
        if (Math.abs(g.py - g.targetPy) > 0.5) return false;
        if (Math.abs(g.px - g.targetPx) > 0.5) return false;
      }
    }
    return true;
  }

  private startRemoval(matches: MatchGroup[]) {
    this.matchesThisTurn.push(...matches);
    const cells = cellsToRemove(matches);
    for (const key of cells) {
      const r = Math.floor(key / BOARD_SIZE);
      const c = key % BOARD_SIZE;
      const g = this.grid[r][c];
      if (g) {
        g.state = "removing";
        g.targetScale = 0;
        g.targetAlpha = 0;
        this.totalRemovedThisTurn++;
      }
    }
    this.phase = "removing";
    this.removeTimer = 0;
    this.emit({ type: "match", groups: matches, cascadeLevel: this.cascadeLevel });
  }

  private rollbackSwap(a: Gem, b: Gem) {
    // возвращаем на исходные позиции
    const r1 = b.row;
    const c1 = b.col;
    const r2 = a.row;
    const c2 = a.col;
    const { x: ax, y: ay } = this.cellCenter(r1, c1);
    const { x: bx, y: by } = this.cellCenter(r2, c2);
    a.targetPx = bx;
    a.targetPy = by;
    b.targetPx = ax;
    b.targetPy = ay;
    this.grid[r1][c1] = b;
    this.grid[r2][c2] = a;
    a.row = r2;
    a.col = c2;
    b.row = r1;
    b.col = c1;
    a.state = "swapping";
    b.state = "swapping";
  }

  private applyGravityAndRefill() {
    // для каждой колонки: собрать существующие гемы вниз, добавить новые сверху
    for (let c = 0; c < BOARD_SIZE; c++) {
      // собираем не-null гемы снизу
      const stack: Gem[] = [];
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        const g = this.grid[r][c];
        if (g) {
          stack.push(g);
          this.grid[r][c] = null;
        }
      }
      // размещаем stack снизу
      let row = BOARD_SIZE - 1;
      for (const g of stack) {
        g.row = row;
        g.col = c;
        const { x, y } = this.cellCenter(row, c);
        g.targetPx = x;
        g.targetPy = y;
        // если гем был выше — он падает (state falling)
        if (Math.abs(g.py - y) > 0.5) {
          g.state = "falling";
        } else {
          g.state = "idle";
        }
        this.grid[row][c] = g;
        row--;
      }
      // заполняем пустые клетки сверху новыми гемами
      let spawnAbove = 1;
      for (let r = row; r >= 0; r--) {
        const color = Math.floor(Math.random() * GEM_COLORS) as GemColor;
        const gem = this.makeGem(color, r, c, true);
        // стартует выше доски
        gem.py = this.metrics.originY - spawnAbove * this.metrics.cellSize - this.metrics.cellSize / 2;
        gem.targetScale = 1;
        gem.scale = 0.85;
        gem.state = "spawning";
        spawnAbove++;
        this.grid[r][c] = gem;
      }
    }
  }

  private endTurn() {
    const cascadeCount = this.cascadeLevel;
    const totalRemoved = this.totalRemovedThisTurn;
    this.cascadeLevel = 0;
    this.matchesThisTurn = [];
    this.totalRemovedThisTurn = 0;
    this.phase = "idle";
    // проверяем, есть ли возможный ход; если нет — перемешать
    if (!hasPossibleMove(this.colorGrid())) {
      this.shuffleBoard();
    }
    this.emit({ type: "turnEnd", totalRemoved, cascadeCount });
  }

  /** Текущий суммарный эффект (урон/щит/лечение/ярость) от матчей этого хода — для отладки/превью. */
  computeTurnEffects(): { damage: number; shield: number; heal: number; rage: number; multiplier: number } {
    let damage = 0,
      shield = 0,
      heal = 0,
      rage = 0;
    // группируем по цвету и считаем
    const byColor: Record<number, MatchGroup[]> = { 0: [], 1: [], 2: [], 3: [] };
    for (const g of this.matchesThisTurn) byColor[g.color].push(g);
    // применяем множители длины и каскада
    for (const g of this.matchesThisTurn) {
      const m = lengthMultiplier(g.length);
      const base = {
        damage: 8,
        shield: 5,
        heal: 4,
        rage: 8,
      };
      // простой расчёт для превью (без каскада, т.к. события генерируются пошагово)
      if (g.color === 0) damage += base.damage * m;
      else if (g.color === 1) shield += base.shield * m;
      else if (g.color === 2) heal += base.heal * m;
      else if (g.color === 3) rage += base.rage * m;
    }
    const cb = cascadeBonus(this.cascadeLevel);
    return {
      damage: damage * (1 + cb),
      shield: shield * (1 + cb),
      heal: heal * (1 + cb),
      rage: rage * (1 + cb),
      multiplier: 1 + cb,
    };
  }

  /** Сбросить доску (новая партия). */
  reset() {
    this.selected = null;
    this.swapPair = null;
    this.phase = "idle";
    this.cascadeLevel = 0;
    this.matchesThisTurn = [];
    this.totalRemovedThisTurn = 0;
    this.generateBoard();
  }

  /** Руна Хаос: поменять цвета двух случайных кристаллов на безопасные. */
  chaosRecolor(): { row: number; col: number; color: GemColor }[] {
    if (this.phase !== "idle") return [];
    // собрать все занятые клетки
    const cells: { row: number; col: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.grid[r][c]) cells.push({ row: r, col: c });
      }
    }
    if (cells.length < 2) return [];
    const changed: { row: number; col: number; color: GemColor }[] = [];
    for (let i = 0; i < 2; i++) {
      const idx = Math.floor(Math.random() * cells.length);
      const cell = cells.splice(idx, 1)[0];
      const gem = this.grid[cell.row][cell.col];
      if (!gem) continue;
      // новый цвет, который не создаёт мгновенный матч в этой клетке
      const forbidden = new Set<GemColor>();
      // соседи
      const nbrs = [
        [cell.row - 1, cell.col],
        [cell.row + 1, cell.col],
        [cell.row, cell.col - 1],
        [cell.row, cell.col + 1],
      ];
      for (const [nr, nc] of nbrs) {
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
        const ng = this.grid[nr][nc];
        if (!ng || ng.color === gem.color) continue;
        // если два соседа одного цвета n — то менять на n нельзя (создаст 3)
        const sameColorNbrs = nbrs
          .filter(
            ([r2, c2]) =>
              r2 >= 0 &&
              r2 < BOARD_SIZE &&
              c2 >= 0 &&
              c2 < BOARD_SIZE &&
              this.grid[r2][c2]?.color === ng.color
          );
        if (sameColorNbrs.length >= 2) forbidden.add(ng.color);
      }
      forbidden.add(gem.color);
      const pool: GemColor[] = [];
      for (let k = 0; k < GEM_COLORS; k++) {
        if (!forbidden.has(k as GemColor)) pool.push(k as GemColor);
      }
      const newColor = pool[Math.floor(Math.random() * pool.length)] ?? gem.color;
      gem.color = newColor;
      // визуальный эффект: лёгкий scale-пульс
      gem.scale = 1.25;
      gem.targetScale = 1;
      changed.push({ row: cell.row, col: cell.col, color: newColor });
    }
    return changed;
  }
}
