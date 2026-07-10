import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PillButton } from "../ui";
import { COLORS, RADII } from "../../constants/theme";
import { approveUsdc, depositUsdc, getUsdcAllowance, validateDepositAmount, type Eip1193Provider } from "../../services/depositFlow";
import { registerLighterApiKey, useLighterOnboarding, type OnboardingStep } from "../../hooks/useLighterOnboarding";
import { parseUnits } from "viem";

interface OnboardingStatusScreenProps {
  walletAddress: `0x${string}`;
  provider: Eip1193Provider;
  onReady: () => void;
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  deposit: "Fund your account",
  registerApiKey: "Authorize trading",
  activateServer: "Activate server",
  ready: "Ready",
};

function StepBadge({ index, active, done }: { index: number; active: boolean; done: boolean }) {
  return (
    <View style={[styles.badge, done && styles.badgeDone, active && styles.badgeActive]}>
      <Text style={[styles.badgeText, (done || active) && styles.badgeTextActive]}>{done ? "✓" : index}</Text>
    </View>
  );
}

export function OnboardingStatusScreen({ walletAddress, provider, onReady }: OnboardingStatusScreenProps) {
  const onboarding = useLighterOnboarding(walletAddress);
  const [depositAmount, setDepositAmount] = useState("10");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    apiKeyPrivateKey: string;
    apiKeyIndex: number;
    accountIndex: number;
  } | null>(null);

  const { step, account, isLoading, error, refresh } = onboarding;

  React.useEffect(() => {
    if (step === "ready") {
      onReady();
    }
  }, [step, onReady]);

  const handleDeposit = async () => {
    const validationError = validateDepositAmount(depositAmount);
    if (validationError) {
      Alert.alert("Invalid amount", validationError);
      return;
    }
    setIsDepositing(true);
    try {
      const requiredAllowance = parseUnits(depositAmount, 6);
      const currentAllowance = await getUsdcAllowance(provider, walletAddress);
      if (currentAllowance < requiredAllowance) {
        const approveTx = await approveUsdc(provider, walletAddress, depositAmount);
        console.log("USDC approve tx:", approveTx);
      }
      const depositTx = await depositUsdc(provider, walletAddress, depositAmount);
      Alert.alert(
        "Deposit sent",
        `Transaction submitted: ${depositTx}\n\nLighter credits deposits within a few minutes. Pull to refresh below once it lands.`,
      );
      await refresh();
    } catch (err) {
      Alert.alert("Deposit failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleRegister = async () => {
    if (!account) return;
    setIsRegistering(true);
    try {
      const result = await registerLighterApiKey(provider, walletAddress, account.index);
      setRegistrationResult(result);
      await refresh();
    } catch (err) {
      Alert.alert("Registration failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRegistering(false);
    }
  };

  const steps: OnboardingStep[] = ["deposit", "registerApiKey", "activateServer"];
  const currentIndex = steps.indexOf(step === "ready" ? "activateServer" : step);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up your account</Text>
      <Text style={styles.subtitle}>Complete these steps once to start trading on Lighter.</Text>

      <View style={styles.stepList}>
        {steps.map((s, index) => (
          <View key={s} style={styles.stepRow}>
            <StepBadge index={index + 1} active={step === s} done={index < currentIndex || step === "ready"} />
            <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>{STEP_LABELS[s]}</Text>
          </View>
        ))}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading && !account && step === "deposit" ? (
        <ActivityIndicator color={COLORS.accent} style={styles.spinner} />
      ) : null}

      {step === "deposit" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deposit USDC</Text>
          <Text style={styles.cardBody}>
            Lighter creates your account on your first deposit. Minimum 1 USDC. Your embedded wallet will approve
            and deposit USDC to the Lighter contract on Ethereum mainnet — this uses real gas and real funds.
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="decimal-pad"
              placeholder="10"
              placeholderTextColor={COLORS.textTertiary}
            />
            <Text style={styles.amountSuffix}>USDC</Text>
          </View>
          <PillButton title="Deposit" onPress={handleDeposit} loading={isDepositing} />
        </View>
      )}

      {step === "registerApiKey" && account && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Authorize trading</Text>
          <Text style={styles.cardBody}>
            Account #{account.index} is funded. Now sign a message authorizing a server-held key to place and
            cancel orders on your behalf — it can never withdraw your funds anywhere but your own wallet.
          </Text>
          <PillButton title="Sign & authorize" onPress={handleRegister} loading={isRegistering} />
        </View>
      )}

      {step === "activateServer" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activate the server</Text>
          <Text style={styles.cardBody}>
            Trading is authorized on-chain. The recipe server generated a fresh key it hasn&apos;t loaded yet — copy the
            values it printed to its console into <Text style={styles.code}>server/.env.local</Text> and restart it,
            then check again.
          </Text>
          {registrationResult && (
            <View style={styles.credentialBox}>
              <Text style={styles.credentialLine}>LIGHTER_ACCOUNT_INDEX={registrationResult.accountIndex}</Text>
              <Text style={styles.credentialLine}>LIGHTER_API_KEY_INDEX={registrationResult.apiKeyIndex}</Text>
              <Text style={styles.credentialLine} numberOfLines={2}>
                LIGHTER_API_KEY_PRIVATE_KEY={registrationResult.apiKeyPrivateKey}
              </Text>
            </View>
          )}
          <PillButton title="Check again" onPress={refresh} variant="secondary" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  stepList: {
    gap: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: {
    borderColor: COLORS.accent,
  },
  badgeDone: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  badgeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: COLORS.textPrimary,
  },
  stepLabel: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  stepLabelActive: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  spinner: {
    marginTop: 12,
  },
  card: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  cardBody: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    fontFamily: "Courier",
    color: COLORS.textPrimary,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.input,
    paddingHorizontal: 16,
    height: 56,
  },
  amountPrefix: {
    color: COLORS.textPrimary,
    fontSize: 20,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 20,
  },
  amountSuffix: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  credentialBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 6,
  },
  credentialLine: {
    color: COLORS.accent,
    fontFamily: "Courier",
    fontSize: 11,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerMuted,
    borderRadius: RADII.input,
    padding: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
  },
});
