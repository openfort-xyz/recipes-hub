// components/LoginScreen.tsx
import React from "react";
import { useGuestAuth } from "@openfort/react-native";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii } from "../constants/theme";

export default function LoginScreen() {
  const { signUpGuest } = useGuestAuth();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Text style={styles.markGlyph}>$</Text>
          </View>
          <Text style={styles.title}>USDC</Text>
          <Text style={styles.tagline}>Send dollars instantly.{"\n"}No fees, no gas.</Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={() => signUpGuest()}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
          </Pressable>
          <Text style={styles.legal}>Continue as a guest · Powered by Openfort</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  mark: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  markGlyph: {
    color: colors.onGreen,
    fontSize: 52,
    fontWeight: "800",
    lineHeight: 58,
  },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    paddingBottom: 12,
    gap: 16,
    alignItems: "center",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: colors.green,
    borderRadius: radii.pill,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    backgroundColor: colors.greenPressed,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: colors.onGreen,
    fontSize: 18,
    fontWeight: "700",
  },
  legal: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
});
