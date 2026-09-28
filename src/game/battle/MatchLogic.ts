// RUNE WARS — логика определения матчей на поле

import type { GemColor, MatchGroup } from "./types";
import { BOARD_SIZE } from "../content/balance";

/**
 * Находит все линии из 3+ кристаллов одного цвета на доске.
 * Возвращает массив MatchGroup. Одна клетка может входить в несколько групп
 * (например, T-форма), но мы объединяем пересекающиеся группы того же цвета
 * и оси, чтобы избежать двойного удаления.
 */
export function findAllMatches(
  grid: (GemColor | -1)[][]
): MatchGroup[] {
  const groups: MatchGroup[] = [];

  // Горизонтальные
  for (let r = 0; r < BOARD_SIZE; r++) {
    let c = 0;
    while (c < BOARD_SIZE) {
      const color = grid[r][c];
      if (color === -1) {
        c++;
        continue;
      }
      let end = c + 1;
      while (end < BOARD_SIZE && grid[r][end] === color) end++;
      const len = end - c;
      if (len >= 3) {
        const cells = [];
        for (let cc = c; cc < end; cc++) cells.push({ row: r, col: cc });
        groups.push({ color, cells, length: len, axis: "h" });
      }
      c = end;
    }
  }

  // Вертикальные
  for (let c = 0; c < BOARD_SIZE; c++) {
    let r = 0;
    while (r < BOARD_SIZE) {
      const color = grid[r][c];
      if (color === -1) {
        r++;
        continue;
      }
      let end = r + 1;
      while (end < BOARD_SIZE && grid[end][c] === color) end++;
      const len = end - r;
      if (len >= 3) {
        const cells = [];
        for (let rr = r; rr < end; rr++) cells.push({ row: rr, col: c });
        groups.push({ color, cells, length: len, axis: "v" });
      }
      r = end;
    }
  }

  return groups;
}

/**
 * Возвращает множество "клеток к удалению" (уникальные row*BOARD_SIZE+col).
 */
export function cellsToRemove(groups: MatchGroup[]): Set<number> {
  const set = new Set<number>();
  for (const g of groups) {
    for (const cell of g.cells) {
      set.add(cell.row * BOARD_SIZE + cell.col);
    }
  }
  return set;
}

/**
 * Проверяет, есть ли хотя бы один матч на доске.
 */
export function hasAnyMatch(grid: (GemColor | -1)[][]): boolean {
  return findAllMatches(grid).length > 0;
}

/**
 * Проверяет, есть ли возможный обмен, создающий матч (чтобы доска была "играбельной").
 * Используется при генерации новой доски.
 */
export function hasPossibleMove(grid: (GemColor | -1)[][]): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cur = grid[r][c];
      if (cur === -1) continue;
      // обмен вправо
      if (c + 1 < BOARD_SIZE) {
        const other = grid[r][c + 1];
        if (other === -1) continue;
        // меняем
        grid[r][c] = other;
        grid[r][c + 1] = cur;
        const ok = hasAnyMatch(grid);
        // откат
        grid[r][c] = cur;
        grid[r][c + 1] = other;
        if (ok) return true;
      }
      // обмен вниз
      if (r + 1 < BOARD_SIZE) {
        const other = grid[r + 1][c];
        if (other === -1) continue;
        grid[r][c] = other;
        grid[r + 1][c] = cur;
        const ok = hasAnyMatch(grid);
        grid[r][c] = cur;
        grid[r + 1][c] = other;
        if (ok) return true;
      }
    }
  }
  return false;
}
