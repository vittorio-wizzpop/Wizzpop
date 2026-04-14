import { create } from 'zustand';
import { GameState, Difficulty, Question } from '../types/game';
import { generateBoard, isMatch, applyGravity, isDeadlock, shuffleBoard } from '../utils/boardUtils';
import { SCORE_CONFIG } from '../utils/scoring';

interface GameStore extends GameState {
  difficulty: Difficulty;
  shuffleCount: number;   // si incrementa ogni volta che la board viene shufflata
  initGame: (difficulty?: Difficulty) => void;
  selectCell: (row: number, col: number) => void;
  answerQuestion: (correct: boolean, timeMs: number) => void;
  setCurrentQuestion: (question: Question) => void;
  getHint: () => [number, number][] | null;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  board: [],
  selected: null,
  score: 0,
  lives: 3,
  combo: 1,
  matchedPairs: 0,
  errors: 0,
  awaitingQuestion: false,
  currentQuestion: null,
  lastMatchedCategory: null,
  levelStartTime: 0,
  difficulty: 1,
  shuffleCount: 0,

  initGame: (difficulty = 1) => {
    set({
      board: generateBoard(),
      selected: null,
      score: 0,
      lives: 3,
      combo: 1,
      matchedPairs: 0,
      errors: 0,
      awaitingQuestion: false,
      currentQuestion: null,
      lastMatchedCategory: null,
      levelStartTime: Date.now(),
      difficulty,
    });
  },

  selectCell: (row, col) => {
    const state = get();
    if (state.awaitingQuestion || state.board[row][col].matched) return;

    if (!state.selected) {
      set({ selected: [row, col] });
      return;
    }

    const [selRow, selCol] = state.selected;
    // Deseleziona se si tocca la stessa cella
    if (selRow === row && selCol === col) {
      set({ selected: null });
      return;
    }

    const selectedCell = state.board[selRow][selCol];
    const targetCell = state.board[row][col];

    if (isMatch(selectedCell, targetCell)) {
      const newBoard = state.board.map(r => r.map(c => ({ ...c })));
      newBoard[row][col].matched = true;
      newBoard[selRow][selCol].matched = true;
      set({
        board: newBoard,
        selected: null,
        awaitingQuestion: true,
        lastMatchedCategory: targetCell.category,
        matchedPairs: state.matchedPairs + 1,
      });
    } else {
      set({
        selected: null,
        lives: Math.max(0, state.lives - 1),
        combo: 1,
        errors: state.errors + 1,
      });
    }
  },

  answerQuestion: (correct, timeMs) => {
    const { score, combo, difficulty } = get();
    const cfg = SCORE_CONFIG[difficulty];
    const base = correct ? cfg.correct : cfg.wrong;
    const speed = correct && timeMs < 5000 ? cfg.speedBonus : 0;
    const total = (base + speed) * (correct ? Math.max(1, combo) : 1);
    const newCombo = correct ? Math.min(combo + 1, 5) : 1;

    let newBoard = applyGravity(get().board);
    let didShuffle = false;
    if (isDeadlock(newBoard)) {
      newBoard = shuffleBoard(newBoard);
      didShuffle = true;
    }

    set({
      score: Math.max(0, score + total),
      combo: newCombo,
      awaitingQuestion: false,
      currentQuestion: null,
      board: newBoard,
      shuffleCount: didShuffle ? get().shuffleCount + 1 : get().shuffleCount,
    });
  },

  setCurrentQuestion: (question) => {
    set({ currentQuestion: question });
  },

  getHint: () => {
    const cells = get().board.flat().filter(c => !c.matched);
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (cells[i].category === cells[j].category) {
          return [[cells[i].row, cells[i].col], [cells[j].row, cells[j].col]];
        }
      }
    }
    return null;
  },

  resetGame: () => get().initGame(get().difficulty),
}));
