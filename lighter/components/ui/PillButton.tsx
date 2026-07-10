import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, type ViewStyle } from "react-native";

import { COLORS, RADII } from "../../constants/theme";

type Variant = "primary" | "danger" | "secondary";

interface PillButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function PillButton({ title, onPress, variant = "primary", disabled, loading, style }: PillButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, variantStyles[variant], isDisabled && styles.disabled, style]}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? COLORS.textPrimary : "#000000"} />
      ) : (
        <Text style={[styles.text, textVariantStyles[variant]]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 17,
    fontWeight: "700",
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: COLORS.accent },
  danger: { backgroundColor: COLORS.danger },
  secondary: { backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.border },
});

const textVariantStyles = StyleSheet.create({
  primary: { color: "#000000" },
  danger: { color: "#000000" },
  secondary: { color: COLORS.textPrimary },
});
