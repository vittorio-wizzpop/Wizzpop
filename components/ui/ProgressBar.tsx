import React, { useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface ProgressBarProps {
  progress: number; // 0–1
  color?: string;
  height?: number;
  animated?: boolean;
}

export function ProgressBar({ progress, color = colors.primary, height = 6, animated = true }: ProgressBarProps) {
  const fillRatio      = useSharedValue(progress);
  const containerWidth = useSharedValue(0);

  useEffect(() => {
    fillRatio.value = animated
      ? withTiming(progress, { duration: 300 })
      : progress;
  }, [progress, animated]);

  // Larghezza in pixel reali — Reanimated v4 su Fabric non accetta stringhe percentuali
  const barStyle = useAnimatedStyle(() => ({
    width: fillRatio.value * containerWidth.value,
  }));

  function onLayout(e: LayoutChangeEvent) {
    containerWidth.value = e.nativeEvent.layout.width;
  }

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }]}
      onLayout={onLayout}
    >
      <Animated.View style={[styles.fill, barStyle, { backgroundColor: color, borderRadius: height / 2, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    backgroundColor: '#E0DFD8',
    overflow: 'hidden',
  },
  fill: {
    // height viene passato come prop inline — evita '100%' su Animated.View con Fabric
  },
});
