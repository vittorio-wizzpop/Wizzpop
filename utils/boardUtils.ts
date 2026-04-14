import { Cell, CategoryKey } from '../types/game';
import { CATEGORIES } from '../data/categories';

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export function generateBoard(rows = 6, cols = 6): Cell[][] {
  let board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => createCell(r, c))
  );
  // Garantisce che non parta in deadlock
  while (isDeadlock(board)) {
    board = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => createCell(r, c))
    );
  }
  return board;
}

function createCell(row: number, col: number): Cell {
  const category = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
  return {
    id: `${row}-${col}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category,
    emoji: CATEGORIES[category].emoji,
    matched: false,
    row,
    col,
  };
}

export function isMatch(a: Cell, b: Cell): boolean {
  return a.category === b.category && a.id !== b.id;
}

export function applyGravity(board: Cell[][]): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard: Cell[][] = Array.from({ length: rows }, () => new Array(cols));

  for (let c = 0; c < cols; c++) {
    // Raccoglie le celle non matchate dalla colonna (dal basso verso l'alto)
    const existing: Cell[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      if (!board[r][c].matched) existing.push({ ...board[r][c] });
    }
    // Riempie la colonna: le esistenti in basso, le nuove in alto
    for (let r = rows - 1; r >= 0; r--) {
      const idx = rows - 1 - r;
      if (idx < existing.length) {
        newBoard[r][c] = { ...existing[idx], row: r, col: c, isNew: false };
      } else {
        const category = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
        newBoard[r][c] = {
          id: `new-${r}-${c}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          category,
          emoji: CATEGORIES[category].emoji,
          matched: false,
          row: r,
          col: c,
          isNew: true,
        };
      }
    }
  }
  return newBoard;
}

export function findAllPossibleMatches(board: Cell[][]): Array<[[number, number], [number, number]]> {
  const cells = board.flat().filter(c => !c.matched);
  const pairs: Array<[[number, number], [number, number]]> = [];
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[i].category === cells[j].category) {
        pairs.push([[cells[i].row, cells[i].col], [cells[j].row, cells[j].col]]);
      }
    }
  }
  return pairs;
}

export function isDeadlock(board: Cell[][]): boolean {
  return findAllPossibleMatches(board).length === 0;
}

export function shuffleBoard(board: Cell[][]): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const unmatched: Cell[] = [];
  const positions: Array<[number, number]> = [];

  board.forEach((row, r) => row.forEach((cell, c) => {
    if (!cell.matched) {
      unmatched.push(cell);
      positions.push([r, c]);
    }
  }));

  // Fisher-Yates shuffle sulle categorie
  for (let i = unmatched.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unmatched[i], unmatched[j]] = [unmatched[j], unmatched[i]];
  }

  positions.forEach(([r, c], i) => {
    newBoard[r][c] = { ...unmatched[i], row: r, col: c };
  });

  return newBoard;
}
