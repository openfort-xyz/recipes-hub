import { OAuthProvider, useGuestAuth, useOAuth } from "@openfort/react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { PillButton } from "./ui";
import { COLORS, RADII } from "../constants/theme";

export default function LoginScreen() {
  const { signUpGuest, isLoading: guestLoading } = useGuestAuth();
  const { initOAuth, isLoading: oauthLoading, error } = useOAuth();

  const handleGuestLogin = () => {
    signUpGuest();
  };

  const handleGoogleLogin = async () => {
    try {
      await initOAuth({ provider: OAuthProvider.GOOGLE });
    } catch (err) {
      console.error("Error logging in with Google:", err);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await initOAuth({ provider: OAuthProvider.APPLE });
    } catch (err) {
      console.error("Error logging in with Apple:", err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>Lighter</Text>
        <Text style={styles.tagline}>Perps trading, powered by Openfort</Text>
      </View>

      <View style={styles.content}>
        <PillButton title="Continue as Guest" onPress={handleGuestLogin} loading={guestLoading} />
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <PillButton
          title="Continue with Google"
          onPress={handleGoogleLogin}
          variant="secondary"
          loading={oauthLoading}
          style={styles.spaced}
        />
        <PillButton title="Continue with Apple" onPress={handleAppleLogin} variant="secondary" loading={oauthLoading} />

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: "center",
    paddingTop: 120,
    paddingBottom: 48,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 8,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  content: {
    paddingHorizontal: 24,
    gap: 12,
  },
  spaced: {
    marginBottom: 12,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  errorBanner: {
    marginTop: 16,
    backgroundColor: COLORS.dangerMuted,
    borderRadius: RADII.input,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 58, 0.3)",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: "center",
  },
});
