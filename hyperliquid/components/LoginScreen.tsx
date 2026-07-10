import { OAuthProvider, useGuestAuth, useOAuth } from "@openfort/react-native";
import { Text, View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";

import { PillButton, colors, spacing } from "./ui";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
  const { signUpGuest } = useGuestAuth();
  const { initOAuth, error } = useOAuth();

  const handleGuestLogin = () => {
    signUpGuest();
  };

  const handleGoogleLogin = async () => {
    try {
      await initOAuth({ provider: "google" as OAuthProvider });
    } catch (err) {
      console.error("Error logging in with Google:", err);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await initOAuth({ provider: "apple" as OAuthProvider });
    } catch (err) {
      console.error("Error logging in with Apple:", err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoDot} />
        <Text style={styles.title}>HYPE</Text>
        <Text style={styles.subtitle}>Trade HYPE on Hyperliquid with an Openfort embedded wallet.</Text>
      </View>

      <View style={styles.content}>
        <PillButton title="Continue as Guest" onPress={handleGuestLogin} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleGoogleLogin} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleAppleLogin} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>Continue with Apple</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
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
    backgroundColor: colors.background,
  },
  header: {
    alignItems: "center",
    paddingTop: height * 0.16,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  logoDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    fontSize: 13,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  errorContainer: {
    backgroundColor: colors.negativeMuted,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
  },
  errorText: {
    color: colors.negative,
    fontSize: 14,
    textAlign: "center",
  },
});
