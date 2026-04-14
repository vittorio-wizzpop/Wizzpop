import { Difficulty, RankKey } from '../types/game';

export const SCORE_CONFIG: Record<Difficulty, {
  match: number;
  correct: number;
  wrong: number;
  speedBonus: number;
  perfect: number;
}> = {
  1: { match: 50,  correct: 100, wrong: 20,  speedBonus: 0,   perfect: 200  },
  2: { match: 80,  correct: 200, wrong: 0,   speedBonus: 100, perfect: 500  },
  3: { match: 120, correct: 400, wrong: -50, speedBonus: 200, perfect: 1000 },
} as const;

export const RANK_THRESHOLDS: Record<RankKey, number> = {
  curioso:     0,
  esploratore: 500,
  pensatore:   1200,
  sapiente:    2500,
  maestro:     5000,
  illuminato:  10000,
};

export const pointsToXP = (points: number): number => Math.floor(points * 0.5);

export const calculateStars = (score: number, maxScore: number, errors: number): 1 | 2 | 3 => {
  if (score / maxScore > 0.9 && errors === 0) return 3;
  if (score / maxScore > 0.6) return 2;
  return 1;
};

/** Restituisce il rango corrispondente all'XP totale */
export const getRankFromXP = (xp: number): RankKey => {
  const ranks = Object.entries(RANK_THRESHOLDS) as Array<[RankKey, number]>;
  // Ordina per soglia decrescente e restituisce il primo che supera
  const sorted = ranks.sort((a, b) => b[1] - a[1]);
  for (const [rank, threshold] of sorted) {
    if (xp >= threshold) return rank;
  }
  return 'curioso';
};
