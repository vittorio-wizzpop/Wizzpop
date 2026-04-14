import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGameStore } from '../../../store/gameStore';
import { GameGrid } from '../../../components/game/GameGrid';
import { ScoreBar } from '../../../components/game/ScoreBar';
import { QuestionModal } from '../../../components/game/QuestionModal';
import { CinematicScreen } from '../../../components/game/CinematicScreen';
import { useCinematic } from '../../../hooks/useCinematic';
import { calculateStars } from '../../../utils/scoring';
import { CinematicQuote, Difficulty } from '../../../types/game';
import { colors } from '../../../theme/colors';

// Coppie da completare per vincere il livello (beta)
const TARGET_PAIRS = 10;
// Punteggio massimo teorico a difficoltà 1: 10 × (match 50 + correct 100) × combo max 5
const MAX_SCORE_D1 = TARGET_PAIRS * 150 * 3;

type GamePhase = 'cinematic_start' | 'playing' | 'cinematic_end' | 'done';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const initGame        = useGameStore(s => s.initGame);
  const lives           = useGameStore(s => s.lives);
  const matchedPairs    = useGameStore(s => s.matchedPairs);
  const awaitingQuestion = useGameStore(s => s.awaitingQuestion);
  const score           = useGameStore(s => s.score);
  const errors          = useGameStore(s => s.errors);

  const { getQuote } = useCinematic();

  const [phase, setPhase]           = useState<GamePhase>('cinematic_start');
  const [endQuote, setEndQuote]     = useState<CinematicQuote | null>(null);
  const [startQuote, setStartQuote] = useState<CinematicQuote | null>(null);

  // Inizializza la partita e prepara la citazione di apertura
  useEffect(() => {
    initGame(1 as Difficulty);
    const q = getQuote('level_start');
    setStartQuote(q);
    if (!q) setPhase('playing');
  }, [id]);

  // Controlla fine livello: vittoria o sconfitta
  useEffect(() => {
    if (phase !== 'playing') return;

    const isWin      = matchedPairs >= TARGET_PAIRS && !awaitingQuestion;
    const isGameOver = lives === 0 && !awaitingQuestion;

    if (isWin || isGameOver) {
      const trigger = isWin ? 'level_complete' : 'game_over';
      const q = getQuote(trigger);
      setEndQuote(q);
      setPhase('cinematic_end');
    }
  }, [lives, matchedPairs, awaitingQuestion, phase]);

  function handleStartCinematicDismiss() {
    setPhase('playing');
  }

  function handleEndCinematicDismiss() {
    setPhase('done');
    const stars = calculateStars(score, MAX_SCORE_D1, errors);
    router.replace({
      pathname: '/(game)/result',
      params: { score: String(score), stars: String(stars), errors: String(errors) },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScoreBar />
        <GameGrid />
        <QuestionModal />
      </View>

      {/* Citazione di apertura livello */}
      {phase === 'cinematic_start' && startQuote && (
        <CinematicScreen quote={startQuote} onDismiss={handleStartCinematicDismiss} />
      )}

      {/* Citazione di fine livello / game over */}
      {phase === 'cinematic_end' && endQuote && (
        <CinematicScreen quote={endQuote} onDismiss={handleEndCinematicDismiss} />
      )}

      {/* Se non c'è citazione di fine, naviga direttamente */}
      {phase === 'cinematic_end' && !endQuote && (() => {
        handleEndCinematicDismiss();
        return null;
      })()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
});
