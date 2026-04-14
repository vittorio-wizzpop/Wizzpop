import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Cell as CellType } from '../../types/game';
import { CATEGORIES } from '../../data/categories';
import { colors } from '../../theme/colors';

interface CellProps {
  cell: CellType;
  isSelected: boolean;
  isHinted: boolean;
  onPress: () => void;
  size: number;
}

export function Cell({ cell, isSelected, isHinted, onPress, size }: CellProps) {
  const scale     = useSharedValue(1);
  const opacity   = useSharedValue(cell.matched ? 0 : 1);
  const translateY = useSharedValue(cell.isNew ? -size * 1.5 : 0);

  // Selezione: rimbalzo leggero
  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.12 : 1, { damping: 12, stiffness: 200 });
  }, [isSelected]);

  // Match: fade-out + restringi
  useEffect(() => {
    if (cell.matched) {
      opacity.value = withTiming(0, { duration: 220 });
      scale.value   = withTiming(0.6, { duration: 220 });
    }
  }, [cell.matched]);

  // Nuova cella che cade dall'alto
  useEffect(() => {
    if (cell.isNew) {
      translateY.value = withSpring(0, { damping: 14, stiffness: 130 });
    }
  }, [cell.isNew]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const cat         = CATEGORIES[cell.category];
  const borderColor = isSelected ? colors.primary : isHinted ? colors.accent : 'transparent';
  const borderWidth = isSelected || isHinted ? 2.5 : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ width: size, height: size, padding: 3 }}
    >
      <Animated.View
        style={[
          styles.cell,
          animStyle,
          { backgroundColor: cat.bg, borderColor, borderWidth },
        ]}
      >
        <Text style={{ fontSize: size * 0.38 }}>{cell.emoji}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
