import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors, radii, spacing } from './theme';

// Flat card: 16-20pt radius, 1px border, no shadow.
export const Card: React.FC<ViewProps> = ({ style, children, ...rest }) => (
  <View style={[styles.card, style]} {...rest}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
