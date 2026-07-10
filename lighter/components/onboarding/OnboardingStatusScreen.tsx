import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PillButton } from "../ui";
import { COLORS, RADII } from "../../constants/theme";
import { approveUsdc, depositUsdc, getUsdcAllowance, validateDepositAmount, type Eip1193Provider } from "../../services/depositFlow";
import { registerLighterApiKey, type OnboardingState, type OnboardingStep } from "../../hooks/useLighterOnboarding";
import { requestFaucet } from "../../services/lighterServerClient";
import { parseUnits } from "viem";

interface OnboardingStatusScreenProps {
  walletAddress: `0x${string}`;
  provider: Eip1193Provider;
  /** Owned by UserScreen — the single source of truth for account/apiKeys/serverConfig, so this
   * screen and the render gate that decides when to leave it never see different data. */
  onboarding: OnboardingState;
  /** Set by UserScreen when a live order failed with Lighter's invalid-signature code — forces
   * the stale-key recovery card open regardless of what step currently computes to, since
   * deriveStep can't detect a mid-session key rotation on its own (see FRICTION_LOG.md's
   * key-rotation entry). */
  keyStale?: boolean;
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

export function OnboardingStatusScreen({ walletAddress, provider, onboarding, keyStale = false }: OnboardingStatusScreenProps) {
  // Fast (2s) polling, owned by UserScreen, means the UI advances on its own the moment an
  // action lands — no manual "pull to refresh" needed anywhere in this screen. UserScreen's
  // render gate leaves this screen the moment step becomes "ready"; there's no separate
  // callback to fire here.
  const [depositAmount, setDepositAmount] = useState("10");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    apiKeyPrivateKey: string;
    apiKeyIndex: number;
    accountIndex: number;
  } | null>(null);
  // Once a sign+submit succeeds, the button that triggered it must not allow an immediate
  // re-tap — ChangePubKey rotates the on-chain key on every submit, so a second tap before the
  // server has picked up the first key silently invalidates it (see FRICTION_LOG.md's
  // key-rotation entry: this is exactly how the user burned a working key). Resets whenever step
  // changes, since that proves the poll caught up to something new and any "pending" state here
  // is stale.
  const [hasSignedThisSession, setHasSignedThisSession] = useState(false);

  const { step, account, serverConfig, accountMismatch, isLoading, error, refresh } = onboarding;
  const isTestnet = serverConfig?.network === "testnet";
  const [isFauceting, setIsFauceting] = useState(false);
  const [isCheckingAgain, setIsCheckingAgain] = useState(false);

  // Adjusting state during render (React's recommended pattern for "reset when an input
  // changes") rather than in an effect — any step transition proves the poll caught up to
  // something new, so a "pending" guard from before is stale and safe to clear.
  const [prevStep, setPrevStep] = useState(step);
  if (step !== prevStep) {
    setPrevStep(step);
    setHasSignedThisSession(false);
  }

  // The server's own startup self-test (see server.ts) can also catch a stale key — but only at
  // the moment the server was last started, so it won't see a rotation that happened mid-session.
  // keyStale (from a live order failure) is the mid-session complement; either signal shows the
  // same recovery card.
  const showStaleKeyCard = keyStale || (step === "activateServer" && Boolean(serverConfig?.serverKeyInvalid));

  const handleFaucet = async () => {
    setIsFauceting(true);
    try {
      await requestFaucet(walletAddress);
      // No success alert — the 2s poll advances the step automatically the moment it lands.
    } catch {
      // The server already retried a few times — Lighter's testnet faucet is intermittently
      // flaky (see FRICTION_LOG.md). Refresh immediately in case an earlier retry actually
      // succeeded upstream despite this final attempt reporting failure.
      await refresh();
      Alert.alert("Faucet unavailable", "Try again — Lighter's testnet faucet is a bit flaky.");
    } finally {
      setIsFauceting(false);
    }
  };

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
        await approveUsdc(provider, walletAddress, depositAmount);
      }
      await depositUsdc(provider, walletAddress, depositAmount);
      await refresh();
    } catch (err) {
      Alert.alert("Deposit failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleRegister = async () => {
    if (!account || hasSignedThisSession) return;
    setIsRegistering(true);
    try {
      const result = await registerLighterApiKey(provider, walletAddress, account.index);
      setRegistrationResult(result);
      setHasSignedThisSession(true);
      await refresh();
    } catch (err) {
      Alert.alert("Registration failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCheckAgain = async () => {
    setIsCheckingAgain(true);
    try {
      await refresh();
    } finally {
      setIsCheckingAgain(false);
    }
  };

  /**
   * "Re-authorize" (recovery cards only, never the first-time "Sign & authorize") always rotates
   * the on-chain key — there's no "just re-display the existing credentials" mode, since
   * ChangePubKey has no way to read a key back, only replace it. A user reading these two
   * similar-looking buttons quickly ("Re-authorize" vs. plain, non-destructive "Check again") can
   * tap the wrong one without registering that it just invalidated whatever key the server was
   * holding — this is what actually happened live (see FRICTION_LOG.md's key-rotation entry).
   * Embedded-wallet personal_sign has no separate native confirmation UI to catch that mistake,
   * so the app has to be the one that asks.
   */
  const confirmReauthorize = () => {
    Alert.alert(
      "Generate a new trading key?",
      "This replaces whatever key the chain currently has for this account right now — any key " +
        "the server (or a previous screen) was holding stops working immediately, with no way to " +
        "get it back.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate new key", style: "destructive", onPress: handleRegister },
      ],
    );
  };

  const steps: OnboardingStep[] = ["deposit", "registerApiKey", "activateServer"];
  const currentIndex = steps.indexOf(step === "ready" ? "activateServer" : step);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up your account</Text>

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

      {step === "deposit" && (isLoading || !serverConfig) && !account ? (
        <ActivityIndicator color={COLORS.accent} style={styles.spinner} />
      ) : null}

      {step === "deposit" && serverConfig && isTestnet && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get testnet funds</Text>
          <Text style={styles.cardBody}>One tap. No signature, no real money.</Text>
          <PillButton title="Get testnet funds" onPress={handleFaucet} loading={isFauceting} />
        </View>
      )}

      {step === "deposit" && serverConfig && !isTestnet && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deposit USDC</Text>
          <Text style={styles.cardBody}>Real gas, real funds. Minimum 1 USDC.</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="decimal-pad"
              placeholder="10"
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
            />
            <Text style={styles.amountSuffix}>USDC</Text>
          </View>
          <PillButton title="Deposit" onPress={handleDeposit} loading={isDepositing} />
        </View>
      )}

      {step === "registerApiKey" && account && !hasSignedThisSession && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Authorize trading</Text>
          <Text style={styles.cardBody}>Sign to let the server trade for you — it can never withdraw elsewhere.</Text>
          <PillButton title="Sign & authorize" onPress={handleRegister} loading={isRegistering} />
        </View>
      )}

      {step === "registerApiKey" && account && hasSignedThisSession && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Authorize trading</Text>
          <Text style={styles.cardBody}>
            Signed — waiting for the server to catch up. Signing again before it does would
            immediately invalidate this key.
          </Text>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      )}

      {showStaleKeyCard && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trading key looks out of date</Text>
          <Text style={styles.cardBody}>
            The server&apos;s key was rejected as an invalid signature — signing again after the
            server already had a key rotates it and strands whatever the server was holding.
            Re-authorize once, then copy the fresh values into{" "}
            <Text style={styles.code}>server/.env.local</Text> and restart.
          </Text>
          {registrationResult ? (
            <View style={styles.credentialBox}>
              <Text style={styles.credentialLine}>LIGHTER_ACCOUNT_INDEX={registrationResult.accountIndex}</Text>
              <Text style={styles.credentialLine}>LIGHTER_API_KEY_INDEX={registrationResult.apiKeyIndex}</Text>
              <Text style={styles.credentialLine} numberOfLines={2}>
                LIGHTER_API_KEY_PRIVATE_KEY={registrationResult.apiKeyPrivateKey}
              </Text>
            </View>
          ) : hasSignedThisSession ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <PillButton title="Re-authorize" onPress={confirmReauthorize} loading={isRegistering} />
          )}
          <PillButton title="Check again" onPress={handleCheckAgain} variant="secondary" loading={isCheckingAgain} />
        </View>
      )}

      {step === "activateServer" && !accountMismatch && !showStaleKeyCard && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activate the server</Text>
          <Text style={styles.cardBody}>
            Copy these into <Text style={styles.code}>server/.env.local</Text> and restart it.
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
          <PillButton title="Check again" onPress={handleCheckAgain} variant="secondary" loading={isCheckingAgain} />
        </View>
      )}

      {step === "activateServer" && accountMismatch && !showStaleKeyCard && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wrong account on the server</Text>
          <Text style={styles.cardBody}>
            Server is signing for account {serverConfig?.accountIndex}, yours is {account?.index} — copy the
            printed values into <Text style={styles.code}>server/.env.local</Text> and restart it.
          </Text>
          {registrationResult ? (
            <View style={styles.credentialBox}>
              <Text style={styles.credentialLine}>LIGHTER_ACCOUNT_INDEX={registrationResult.accountIndex}</Text>
              <Text style={styles.credentialLine}>LIGHTER_API_KEY_INDEX={registrationResult.apiKeyIndex}</Text>
              <Text style={styles.credentialLine} numberOfLines={2}>
                LIGHTER_API_KEY_PRIVATE_KEY={registrationResult.apiKeyPrivateKey}
              </Text>
            </View>
          ) : hasSignedThisSession ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <>
              <Text style={styles.cardBody}>
                This session doesn&apos;t have those values anymore — re-authorize to get a fresh set.
              </Text>
              <PillButton title="Re-authorize" onPress={confirmReauthorize} loading={isRegistering} />
            </>
          )}
          <PillButton title="Check again" onPress={handleCheckAgain} variant="secondary" loading={isCheckingAgain} />
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
