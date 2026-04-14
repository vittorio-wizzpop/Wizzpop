import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button } from '../components/ui/Button';
import { colors } from '../theme/colors';

export default function HomeScreen() {
  const logoScale    = useSharedValue(0.6);
  const logoOpacity  = useSharedValue(0);
  const taglineOp    = useSharedValue(0);
  const btnOp        = useSharedValue(0);
  const btnPulse     = useSharedValue(1);

  useEffect(() => {
    // Entrata logo
    logoScale.value   = withSpring(1, { damping: 12, stiffness: 140 });
    logoOpacity.value = withTiming(1, { duration: 500 });

    // Tagline e bottone in stagger
    taglineOp.value = withDelay(400, withTiming(1, { duration: 500 }));
    btnOp.value     = withDelay(700, withTiming(1, { duration: 500 }));

    // Pulsazione continua sul bottone play
    btnPulse.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800 }),
        withTiming(1.00, { duration: 800 }),
      ),
      -1,
      true,
    ));
  }, []);

  const logoStyle    = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOp.value }));
  const btnStyle     = useAnimatedStyle(() => ({
    opacity: btnOp.value,
    transform: [{ scale: btnPulse.value }],
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.hero}>
          <Animated.View style={[styles.logoBox, logoStyle]}>
            <Text style={styles.logoEmoji}>🧠</Text>
            <Text style={styles.logoText}>WizzPop</Text>
          </Animated.View>

          <Animated.Text style={[styles.tagline, taglineStyle]}>
            Gioca. Impara. Sorprenditi.
          </Animated.Text>
        </View>

        <Animated.View style={[styles.btnWrapper, btnStyle]}>
          <Button
            label="▶  Gioca ora"
            onPress={() => router.push('/(game)/level/1')}
            style={styles.playBtn}
          />
        </Animated.View>

        <Text style={styles.version}>Beta v0.1</Text>

      </View>
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
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logoBox: {
    alignItems: 'center',
    gap: 10,
  },
  logoEmoji: {
    fontSize: 72,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 17,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  btnWrapper: {
    alignSelf: 'stretch',
  },
  playBtn: {
    alignSelf: 'stretch',
    paddingVertical: 18,
  },
  version: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 16,
  },
});
