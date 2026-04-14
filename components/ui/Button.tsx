import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  const bgColor = {
    primary:   colors.primary,
    secondary: colors.surface,
    ghost:     'transparent',
  }[variant];

  const textColor = {
    primary:   '#FFFFFF',
    secondary: colors.primary,
    ghost:     colors.primary,
  }[variant];

  const borderColor = variant === 'secondary' ? colors.primary : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        { backgroundColor: bgColor, borderColor, borderWidth: variant === 'secondary' ? 1.5 : 0, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
