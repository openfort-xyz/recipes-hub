import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { colors, radii } from './theme';

type PillButtonVariant = 'primary' | 'danger' | 'secondary';

interface PillButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: PillButtonVariant;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<PillButtonVariant, { background: string; text: string }> = {
  primary: { background: colors.accent, text: '#000000' },
  danger: { background: colors.negative, text: '#FFFFFF' },
  secondary: { background: colors.surfaceRaised, text: colors.textPrimary },
};

export const PillButton: React.FC<PillButtonProps> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}) => {
  const { background, text } = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor: isDisabled ? colors.disabled : background },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={text} />
      ) : (
        <Text style={[styles.text, { color: isDisabled ? colors.textTertiary : text }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

interface BackChevronProps {
  onPress: () => void;
}

export const BackChevron: React.FC<BackChevronProps> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} hitSlop={16} style={styles.backChevron}>
    <View style={styles.chevronShape} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  backChevron: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronShape: {
    width: 12,
    height: 12,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.textPrimary,
    transform: [{ rotate: '45deg' }],
  },
});
