import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { StarRating } from '../../components/ui/StarRating';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { useProgressStore } from '../../store/progressStore';

export default function ResultScreen() {
  const { score, stars, errors } = useLocalSearchParams<{
    score: string;
    stars: string;
    errors: string;
  }>();

  const parsedScore  = parseInt(score  ?? '0', 10);
  const parsedStars  = (parseInt(stars ?? '1', 10) as 1 | 2 | 3);
  const parsedErrors = parseInt(errors ?? '0', 10);

  const saveLevel    = useProgressStore(s => s.saveLevel);
  const addXP        = useProgressStore(s => s.addXP);
  const updateStreak = useProgressStore(s => s.updateStreak);

  const titleText = parsedStars === 3 ? 'Perfetto! 🎉' : parsedStars === 2 ? 'Ben fatto!' : 'Ci sei quasi!';

  // Animazioni entrata
  const containerOp = useSharedValue(0);
  const starsScale  = useSharedValue(0.5);
  const scoreOp     = useSharedValue(0);
  const btnsOp      = useSharedValue(0);

  // Salva progressione al primo render
  useEffect(() => {
    saveLevel('1', {
      stars: parsedStars,
      bestScore: parsedScore,
      completedAt: new Date().toISOString(),
      errors: parsedErrors,
    });
    addXP(parsedScore);
    updateStreak();
  }, []);

  useEffect(() => {
    containerOp.value = withTiming(1, { duration: 350 });
    starsScale.value  = withDelay(200, withSpring(1, { damping: 10, stiffness: 120 }));
    scoreOp.value     = withDelay(600, withTiming(1, { duration: 400 }));
    btnsOp.value      = withDelay(900, withTiming(1, { duration: 400 }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOp.value }));
  const starsStyle     = useAnimatedStyle(() => ({ transform: [{ scale: starsScale.value }] }));
  const scoreStyle     = useAnimatedStyle(() => ({ opacity: scoreOp.value }));
  const btnsStyle      = useAnimatedStyle(() => ({ opacity: btnsOp.value }));

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, containerStyle]}>

        {/* Header risultato */}
        <View style={styles.hero}>
          <Text style={styles.title}>{titleText}</Text>

          <Animated.View style={starsStyle}>
            <StarRating stars={parsedStars} size={44} />
          </Animated.View>
        </View>

        {/* Score e statistiche */}
        <Animated.View style={[styles.statsCard, scoreStyle]}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>PUNTEGGIO</Text>
            <Text style={styles.statValue}>{parsedScore.toLocaleString('it-IT')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>ERRORI</Text>
            <Text style={[styles.statValue, parsedErrors > 0 && { color: colors.error }]}>
              {parsedErrors}
            </Text>
          </View>
        </Animated.View>

        {/* Azioni */}
        <Animated.View style={[styles.buttons, btnsStyle]}>
          <Button
            label="↺  Rigioca"
            onPress={() => router.replace('/(game)/level/1')}
            style={styles.btn}
          />
          <Button
            label="🏠  Home"
            onPress={() => router.replace('/')}
            variant="secondary"
            style={styles.btn}
          />
        </Animated.View>

      </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  hero: {
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.dark,
    textAlign: 'center',
  },
  statsCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.dark,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDECE6',
  },
  buttons: {
    alignSelf: 'stretch',
    gap: 12,
  },
  btn: {
    alignSelf: 'stretch',
    paddingVertical: 16,
  },
});
