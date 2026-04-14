import { useRef, useCallback } from 'react';
import { CinematicQuote } from '../types/game';
import { CINEMATIC_QUOTES } from '../data/quotes';

type Trigger = CinematicQuote['trigger'];

/**
 * Restituisce una citazione cinematica per il trigger richiesto,
 * evitando di ripetere l'ultima mostrata per quel trigger.
 */
export function useCinematic() {
  const lastShownId = useRef<Partial<Record<Trigger, string>>>({});

  const getQuote = useCallback((trigger: Trigger): CinematicQuote | null => {
    const pool = CINEMATIC_QUOTES.filter(q => q.trigger === trigger);
    if (pool.length === 0) return null;

    const lastId = lastShownId.current[trigger];
    const fresh  = pool.filter(q => q.author + q.text !== lastId);
    const source = fresh.length > 0 ? fresh : pool;

    const quote = source[Math.floor(Math.random() * source.length)];
    lastShownId.current[trigger] = quote.author + quote.text;

    return quote;
  }, []);

  return { getQuote };
}
