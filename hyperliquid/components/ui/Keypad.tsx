import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors } from './theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;
type Key = (typeof KEYS)[number];

interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxDecimals?: number;
}

// Full-screen numeric entry, no OS keyboard — mirrors Cash App's pay-amount keypad.
export const Keypad: React.FC<KeypadProps> = ({ value, onChange, maxDecimals = 2 }) => {
  const handleKeyPress = useCallback(
    (key: Key) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (key === 'del') {
        onChange(value.slice(0, -1));
        return;
      }

      if (key === '.') {
        if (value.includes('.')) return;
        onChange(value.length === 0 ? '0.' : `${value}.`);
        return;
      }

      const decimalIndex = value.indexOf('.');
      if (decimalIndex !== -1 && value.length - decimalIndex - 1 >= maxDecimals) {
        return;
      }

      if (value === '0') {
        onChange(key);
        return;
      }

      onChange(`${value}${key}`);
    },
    [value, onChange, maxDecimals]
  );

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <TouchableOpacity
          key={key}
          style={styles.key}
          activeOpacity={0.5}
          onPress={() => handleKeyPress(key)}
        >
          {key === 'del' ? (
            <View style={styles.deleteGlyph} />
          ) : (
            <Text style={styles.keyText}>{key}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.333%',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deleteGlyph: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
  },
});
