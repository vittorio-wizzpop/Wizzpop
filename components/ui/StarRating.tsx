import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';

interface StarRatingProps {
  stars: 1 | 2 | 3;
  size?: number;
}

function AnimatedStar({ filled, index, size }: { filled: boolean; index: number; size: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 200, withSpring(1, { damping: 10, stiffness: 160 }));
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: size, opacity: filled ? 1 : 0.25 }}>⭐</Text>
    </Animated.View>
  );
}

export function StarRating({ stars, size = 36 }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3].map(i => (
        <AnimatedStar key={i} filled={i <= stars} index={i - 1} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
