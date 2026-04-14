import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/gameStore';
import { useQuestions } from '../../hooks/useQuestions';
import { useHaptics } from '../../hooks/useHaptics';
import { AnswerOption, OptionState } from './AnswerOption';
import { ProgressBar } from '../ui/ProgressBar';
import { colors } from '../../theme/colors';
import { CATEGORIES } from '../../data/categories';
import { CategoryKey } from '../../types/game';

type Phase = 'question' | 'answered';

export function QuestionModal() {
  const awaitingQuestion      = useGameStore(s => s.awaitingQuestion);
  const lastMatchedCategory   = useGameStore(s => s.lastMatchedCategory);
  const answerQuestion        = useGameStore(s => s.answerQuestion);
  const setCurrentQuestion    = useGameStore(s => s.setCurrentQuestion);

  const category = (lastMatchedCategory ?? 'wild') as CategoryKey;
  const { getQuestion } = useQuestions({ category });
  const haptics = useHaptics();

  const [phase, setPhase]               = useState<Phase>('question');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timerProgress, setTimerProgress] = useState(1);

  const question       = useGameStore(s => s.currentQuestion);
  const startTimeRef   = useRef<number>(0);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slide-up animation
  const translateY = useSharedValue(600);
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Carica domanda quando si apre il modal
  useEffect(() => {
    if (awaitingQuestion) {
      const q = getQuestion();
      if (q) setCurrentQuestion(q);
      setPhase('question');
      setSelectedIndex(null);
      setTimerProgress(1);
      startTimeRef.current = Date.now();
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      translateY.value = withTiming(600, { duration: 280 });
    }
  }, [awaitingQuestion]);

  // Countdown timer
  useEffect(() => {
    if (!awaitingQuestion || phase === 'answered' || !question) return;
    const total = question.timeLimitSeconds * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.max(0, 1 - elapsed / total);
      setTimerProgress(progress);
      if (progress <= 0) handleAnswer(-1); // timeout = risposta sbagliata
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [awaitingQuestion, phase, question]);

  function handleAnswer(index: number) {
    if (phase === 'answered') return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedIndex(index);
    setPhase('answered');

    const correct = index === question?.correctIndex;
    const timeMs  = Date.now() - startTimeRef.current;

    if (correct) haptics.triggerSuccess();
    else         haptics.triggerWrong();

    // Mostra la curiosità per 2.8s poi chiude
    setTimeout(() => answerQuestion(correct, timeMs), 2800);
  }

  function getOptionState(index: number): OptionState {
    if (phase === 'question')     return 'default';
    if (index === question?.correctIndex) return 'correct';
    if (index === selectedIndex)  return 'wrong';
    return 'disabled';
  }

  if (!question) return null;

  const cat           = CATEGORIES[question.category];
  const timerColor    = timerProgress > 0.4 ? colors.primary : colors.error;

  return (
    <Modal transparent visible={awaitingQuestion} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.panel, panelStyle]}>

          {/* Categoria + timer */}
          <View style={styles.header}>
            <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
              <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
              <Text style={[styles.catLabel, { color: cat.text }]}>{cat.label}</Text>
            </View>
            <ProgressBar progress={timerProgress} color={timerColor} height={6} animated={false} />
          </View>

          {/* Domanda */}
          <Text style={styles.questionText}>{question.text}</Text>

          {/* Opzioni */}
          <View style={styles.options}>
            {question.options.map((opt, i) => (
              <AnswerOption
                key={i}
                label={opt}
                index={i}
                state={getOptionState(i)}
                onPress={() => handleAnswer(i)}
              />
            ))}
          </View>

          {/* Curiosità post-risposta */}
          {phase === 'answered' && (
            <View style={styles.factBox}>
              <Text style={styles.factIcon}>💡</Text>
              <Text style={styles.factText}>{question.fact}</Text>
            </View>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    gap: 10,
  },
  catBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    lineHeight: 26,
  },
  options: {
    gap: 8,
  },
  factBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEC',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0E9C0',
  },
  factIcon: {
    fontSize: 18,
  },
  factText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
});
