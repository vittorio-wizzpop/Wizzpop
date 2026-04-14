import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/gameStore';
import { colors } from '../../theme/colors';

function LivesDisplay({ lives }: { lives: number }) {
  return (
    <View style={styles.livesRow}>
      {[1, 2, 3].map(i => (
        <Text key={i} style={[styles.heart, { opacity: i <= lives ? 1 : 0.2 }]}>❤️</Text>
      ))}
    </View>
  );
}

function ComboDisplay({ combo }: { combo: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (combo > 1) {
      scale.value = withSequence(
        withTiming(1.4, { duration: 120 }),
        withSpring(1, { damping: 10 }),
      );
    }
  }, [combo]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (combo <= 1) return null;

  return (
    <Animated.View style={[styles.comboBadge, animStyle]}>
      <Text style={styles.comboText}>×{combo}</Text>
    </Animated.View>
  );
}

export function ScoreBar() {
  const score = useGameStore(s => s.score);
  const lives = useGameStore(s => s.lives);
  const combo = useGameStore(s => s.combo);

  return (
    <View style={styles.container}>
      <LivesDisplay lives={lives} />

      <View style={styles.scoreWrapper}>
        <Text style={styles.scoreLabel}>PUNTI</Text>
        <Text style={styles.scoreValue}>{score.toLocaleString('it-IT')}</Text>
      </View>

      <ComboDisplay combo={combo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#EDECE6',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 4,
    minWidth: 80,
  },
  heart: {
    fontSize: 20,
  },
  scoreWrapper: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark,
  },
  comboBadge: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 80,
    alignItems: 'flex-end',
  },
  comboText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
