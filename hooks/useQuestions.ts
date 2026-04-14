import { useRef, useCallback } from 'react';
import { Question, CategoryKey, Difficulty } from '../types/game';
import { ALL_QUESTIONS } from '../data/questions/index';

interface UseQuestionsOptions {
  category: CategoryKey;
  difficulty?: Difficulty;
  avoidRepeatCount?: number; // quante domande recenti evitare (default: 5)
}

/**
 * Hook per selezionare domande per categoria senza ripetizioni ravvicinate.
 * Mantiene uno storico degli ID già mostrati e li evita fino a esaurimento pool.
 */
export function useQuestions({ category, difficulty, avoidRepeatCount = 5 }: UseQuestionsOptions) {
  const recentIds = useRef<string[]>([]);

  const getQuestion = useCallback((): Question | null => {
    let pool = ALL_QUESTIONS.filter(q => q.category === category);

    if (difficulty !== undefined) {
      pool = pool.filter(q => q.difficulty <= difficulty);
    }

    if (pool.length === 0) return null;

    // Preferisci domande non recenti; se non ce ne sono, usa tutto il pool
    const fresh = pool.filter(q => !recentIds.current.includes(q.id));
    const candidates = fresh.length > 0 ? fresh : pool;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    // Aggiorna storico
    recentIds.current = [picked.id, ...recentIds.current].slice(0, avoidRepeatCount);

    return picked;
  }, [category, difficulty, avoidRepeatCount]);

  const resetHistory = useCallback(() => {
    recentIds.current = [];
  }, []);

  return { getQuestion, resetHistory };
}
