import { useEmailAuthOtp, useGuestAuth } from "@openfort/react-native";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { PillButton } from "./ui";
import { COLORS, RADII } from "../constants/theme";

type OtpStep = "email" | "code";

export default function LoginScreen() {
  const { signUpGuest, isLoading: guestLoading, error: guestError } = useGuestAuth();
  const {
    requestEmailOtp,
    signInEmailOtp,
    isLoading: otpLoading,
    error: otpError,
  } = useEmailAuthOtp();

  const [step, setStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const error = guestError ?? otpError;

  const handleGuestLogin = async () => {
    const result = await signUpGuest();
    if (result?.error) {
      console.error("Guest sign-up failed:", result.error);
    }
  };

  const handleSendCode = async () => {
    if (!email.trim()) return;
    const result = await requestEmailOtp({ email: email.trim() });
    if (result?.error) {
      console.error("Failed to send OTP:", result.error);
      return;
    }
    setStep("code");
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    const result = await signInEmailOtp({ email: email.trim(), otp: code.trim() });
    if (result?.error) {
      console.error("OTP verification failed:", result.error);
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

        {step === "email" ? (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <PillButton
              title="Send code"
              onPress={handleSendCode}
              variant="secondary"
              loading={otpLoading}
              disabled={!email.trim()}
            />
          </>
        ) : (
          <>
            <Text style={styles.otpHint}>Enter the code sent to {email}</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="number-pad"
            />
            <PillButton
              title="Verify"
              onPress={handleVerifyCode}
              loading={otpLoading}
              disabled={!code.trim()}
            />
            <PillButton
              title="Use a different email"
              onPress={() => {
                setStep("email");
                setCode("");
              }}
              variant="secondary"
              disabled={otpLoading}
            />
          </>
        )}

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
  input: {
    height: 56,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
    backgroundColor: COLORS.surfaceRaised,
  },
  otpHint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
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
