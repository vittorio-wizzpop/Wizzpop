export type CategoryKey = 'geo' | 'sci' | 'art' | 'hist' | 'wild';
export type Difficulty = 1 | 2 | 3;
export type WorldKey = 'origini' | 'civilta' | 'scoperte' | 'arti' | 'futuro';
export type RankKey = 'curioso' | 'esploratore' | 'pensatore' | 'sapiente' | 'maestro' | 'illuminato';

export interface Cell {
  id: string;
  category: CategoryKey;
  emoji: string;
  matched: boolean;
  row: number;      // 0=top, 5=bottom
  col: number;      // 0=left, 5=right
  isNew?: boolean;  // true = generata dalla gravità (anima entrata dall'alto)
}

export interface Question {
  id: string;             // es. "GEO-042"
  category: CategoryKey;
  difficulty: Difficulty;
  world: WorldKey;
  text: string;
  options: string[];      // sempre 4 opzioni
  correctIndex: number;   // 0-3
  fact: string;           // curiosità mostrata dopo la risposta — IL CUORE DEL PRODOTTO
  factSource: string;
  tags: string[];
  minAge: number;
  timeLimitSeconds: number;
  translations?: Record<string, { text: string; options: string[]; fact: string }>;
}

export interface GameState {
  board: Cell[][];
  selected: [number, number] | null;
  score: number;
  lives: number;          // max 3
  combo: number;          // 1-5
  matchedPairs: number;
  errors: number;
  awaitingQuestion: boolean;
  currentQuestion: Question | null;
  lastMatchedCategory: CategoryKey | null;
  levelStartTime: number;
}

export interface LevelResult {
  stars: 1 | 2 | 3;
  bestScore: number;
  completedAt: string;
  errors: number;
}

export interface ProgressState {
  xp: number;
  rank: RankKey;
  completedLevels: Record<string, LevelResult>;
  unlockedWorlds: WorldKey[];
  badges: string[];
  streak: number;
  lastPlayedDate: string;
  settings: {
    difficulty: Difficulty;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    language: string;
  };
}

export interface CinematicQuote {
  era: string;
  text: string;
  author: string;
  context: string;
  world: WorldKey;
  particleColor: string;
  trigger: 'level_complete' | 'level_start' | 'season_end' | 'rank_up' | 'game_over';
}
