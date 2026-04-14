import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

export type OptionState = 'default' | 'correct' | 'wrong' | 'disabled';

interface AnswerOptionProps {
  label: string;
  index: number;       // 0-3, usato per la lettera A B C D
  state: OptionState;
  onPress: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

const BG: Record<OptionState, string> = {
  default:  colors.surface,
  correct:  '#E8F5D6',
  wrong:    '#FCE8E8',
  disabled: colors.surface,
};

const BORDER: Record<OptionState, string> = {
  default:  '#E0DFD8',
  correct:  colors.success,
  wrong:    colors.error,
  disabled: '#E0DFD8',
};

export function AnswerOption({ label, index, state, onPress }: AnswerOptionProps) {
  const scale    = useSharedValue(1);
  const bgAnim   = useSharedValue(0); // 0=default, usato per transizione colore via opacity overlay

  useEffect(() => {
    if (state === 'correct' || state === 'wrong') {
      scale.value = withSpring(1.03, { damping: 12 });
    } else {
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = state === 'disabled' || state === 'correct' || state === 'wrong';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      <Animated.View
        style={[
          styles.option,
          animStyle,
          { backgroundColor: BG[state], borderColor: BORDER[state] },
        ]}
      >
        <Text style={[styles.letter, { color: BORDER[state] }]}>{LETTERS[index]}</Text>
        <Text
          style={[
            styles.label,
            state === 'correct' && { color: colors.success, fontWeight: '700' },
            state === 'wrong'   && { color: colors.error,   fontWeight: '700' },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {state === 'correct' && <Text style={styles.icon}>✓</Text>}
        {state === 'wrong'   && <Text style={styles.icon}>✗</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  letter: {
    fontSize: 13,
    fontWeight: '800',
    width: 20,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
});
