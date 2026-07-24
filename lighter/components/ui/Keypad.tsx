import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS } from "../../constants/theme";

interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxDecimals?: number;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function Keypad({ value, onChange, maxDecimals = 6 }: KeypadProps) {
  const handlePress = (key: string) => {
    Haptics.selectionAsync();
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." && value.includes(".")) {
      return;
    }
    if (value.includes(".")) {
      const decimals = value.split(".")[1] ?? "";
      if (decimals.length >= maxDecimals) {
        return;
      }
    }
    if (value === "0" && key !== ".") {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <TouchableOpacity
          key={key}
          style={styles.key}
          onPress={() => handlePress(key)}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={key === "⌫" ? "Delete" : key}
        >
          <Text style={styles.keyText}>{key}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  key: {
    width: "33.33%",
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 30,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
});
