import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { CinematicQuote } from '../../types/game';

interface CinematicScreenProps {
  quote: CinematicQuote;
  onDismiss: () => void;
}

// Particella singola che fluttua verso l'alto in loop
function FloatingParticle({ x, size, color, delay, duration }: {
  x: number; size: number; color: string; delay: number; duration: number;
}) {
  const { height } = useWindowDimensions();
  const translateY = useSharedValue(0);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    opacity.value    = withDelay(delay, withTiming(0.6, { duration: 600 }));
    translateY.value = withDelay(delay, withTiming(-height * 0.8, { duration }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.particle, style, {
      left: x, width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      bottom: 60,
    }]} />
  );
}

const PARTICLE_SLOTS = [6, 13, 21, 30, 39, 48, 57, 66, 75, 84, 91];

export function CinematicScreen({ quote, onDismiss }: CinematicScreenProps) {
  const { width, height } = useWindowDimensions();

  // Letterbox bars
  const letterboxH = useSharedValue(height * 0.22);
  // Text opacities — staggered
  const eraOp    = useSharedValue(0);
  const quoteOp  = useSharedValue(0);
  const authorOp = useSharedValue(0);
  const ctxOp    = useSharedValue(0);
  // Timer progress bar
  const timerW   = useSharedValue(1);

  useEffect(() => {
    // Letterbox si assesta
    letterboxH.value = withSpring(height * 0.13, { damping: 18 });

    // Testo in stagger
    eraOp.value    = withDelay(400,  withTiming(1, { duration: 600 }));
    quoteOp.value  = withDelay(1000, withTiming(1, { duration: 700 }));
    authorOp.value = withDelay(2200, withTiming(1, { duration: 500 }));
    ctxOp.value    = withDelay(3000, withTiming(0.65, { duration: 500 }));

    // Timer 6s → poi dismiss
    timerW.value = withDelay(500, withTiming(0, { duration: 5500 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    }));
  }, []);

  const lbStyle    = useAnimatedStyle(() => ({ height: letterboxH.value }));
  const eraStyle   = useAnimatedStyle(() => ({ opacity: eraOp.value }));
  const quoteStyle = useAnimatedStyle(() => ({ opacity: quoteOp.value }));
  const authStyle  = useAnimatedStyle(() => ({ opacity: authorOp.value }));
  const ctxStyle   = useAnimatedStyle(() => ({ opacity: ctxOp.value }));
  // width in pixel reali — Reanimated v4 su Fabric non accetta stringhe percentuali
  const timerStyle = useAnimatedStyle(() => ({ width: timerW.value * width }));

  return (
    <TouchableOpacity style={[styles.screen, { width, height }]} activeOpacity={1} onPress={onDismiss}>

      {/* Particelle ambientali */}
      {PARTICLE_SLOTS.map((slot, i) => (
        <FloatingParticle
          key={i}
          x={(slot / 100) * width}
          size={4 + (i % 3) * 3}
          color={quote.particleColor}
          delay={i * 280}
          duration={3000 + (i % 4) * 600}
        />
      ))}

      {/* Letterbox top */}
      <Animated.View style={[styles.letterbox, lbStyle, { top: 0, width }]} />

      {/* Contenuto centrale */}
      <View style={styles.content}>
        <Animated.Text style={[styles.era, eraStyle]}>{quote.era.toUpperCase()}</Animated.Text>
        <Animated.Text style={[styles.quote, quoteStyle]}>"{quote.text}"</Animated.Text>
        <Animated.Text style={[styles.author, authStyle]}>— {quote.author}</Animated.Text>
        <Animated.Text style={[styles.context, ctxStyle]}>{quote.context}</Animated.Text>
      </View>

      {/* Letterbox bottom */}
      <Animated.View style={[styles.letterbox, lbStyle, { bottom: 0, width }]}>
        {/* Timer bar dentro il letterbox inferiore */}
        <Animated.View style={[styles.timerBar, timerStyle, { backgroundColor: quote.particleColor }]} />
      </Animated.View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    backgroundColor: '#0A0A0A',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
  letterbox: {
    position: 'absolute',
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 18,
  },
  era: {
    color: '#888880',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  quote: {
    color: '#F5F4EE',
    fontSize: 22,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 34,
    fontStyle: 'italic',
  },
  author: {
    color: '#D4C89A',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  context: {
    color: '#888880',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  timerBar: {
    height: 3,
    borderRadius: 2,
  },
});
