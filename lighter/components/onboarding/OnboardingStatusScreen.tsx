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
   * deriveStep can't detect a mid-session key rotation on its own. */
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
  // Once a sign+submit succeeds, the button that triggered it must not allow an immediate
  // re-tap — ChangePubKey rotates the on-chain key on every submit, so a second tap before the
  // server has picked up the first key silently invalidates it (this is exactly how a user
  // burned a working key). Resets whenever step
  // changes, since that proves the poll caught up to something new and any "pending" state here
  // is stale.
  const [hasSignedThisSession, setHasSignedThisSession] = useState(false);

  const { step, account, serverConfig, accountMismatch, isLoading, error, refresh } = onboarding;
  const isTestnet = serverConfig?.network === "testnet";
  const [isFauceting, setIsFauceting] = useState(false);
  // Faucet call accepted, funds not yet visible — see handleFaucet.
  const [hasRequestedFaucet, setHasRequestedFaucet] = useState(false);

  // Adjusting state during render (React's recommended pattern for "reset when an input
  // changes") rather than in an effect — any step transition proves the poll caught up to
  // something new, so a "pending" guard from before is stale and safe to clear.
  const [prevStep, setPrevStep] = useState(step);
  if (step !== prevStep) {
    setPrevStep(step);
    setHasSignedThisSession(false);
    setHasRequestedFaucet(false);
  }

  // ChangePubKey submit makes the server adopt the fresh key immediately (see
  // server/src/orders.ts's adoptServerKey) and the poll below picks that up within one interval —
  // so in the happy path, "activateServer" is never actually seen on screen. Reaching it here is
  // now a genuine anomaly: someone hand-edited server/.env.local to a stale key, a second server
  // process is running, or the .env.local write failed and a later restart lost the adoption. The
  // fix is the same either way — sign again so whichever server answers the next request adopts a
  // fresh key. keyStale (set from a live order failure) covers the mid-session case deriveStep's
  // inputs can't see on their own; both land on this same recovery card.
  const needsRecovery = keyStale || step === "activateServer";

  const handleFaucet = async () => {
    setIsFauceting(true);
    try {
      await requestFaucet(walletAddress);
      // The request returning is not the funds arriving — Lighter credits the account
      // asynchronously, seconds later. Without this the button would snap back to its idle label
      // with nothing on screen having changed, which reads as "the tap did nothing". Cleared by
      // the step-change reset below, once the 2s poll sees the balance.
      setHasRequestedFaucet(true);
    } catch {
      // The server already retried a few times — Lighter's testnet faucet is intermittently
      // flaky. Refresh immediately in case an earlier retry actually
      // succeeded upstream despite this final attempt reporting failure.
      await refresh();
      setHasRequestedFaucet(false);
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
      await registerLighterApiKey(provider, walletAddress, account.index);
      setHasSignedThisSession(true);
      await refresh();
    } catch (err) {
      Alert.alert("Registration failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRegistering(false);
    }
  };

  /**
   * "Re-authorize" (recovery card only, never the first-time "Sign & authorize") always rotates
   * the on-chain key — there's no "just re-display the existing key" mode, since ChangePubKey has
   * no way to read a key back, only replace it. The server adopts whatever this produces
   * automatically, so the only real risk left is that any OTHER client already holding the
   * current key (another server instance, an earlier session) stops working the instant this
   * fires. Embedded-wallet personal_sign has no native confirmation UI of its own, so the app has
   * to be the one that asks before a destructive action like this fires silently.
   */
  const confirmReauthorize = () => {
    Alert.alert(
      "Generate a new trading key?",
      "The server adopts the new key automatically — no manual step. The only risk is to anyone " +
        "else still using the current key: another server instance or an earlier session stops " +
        "working the moment this replaces it, with no way to get it back.",
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
          <Text style={styles.cardBody}>
            {hasRequestedFaucet
              ? "Requested. Lighter credits the account a few seconds later — this advances on its own the moment the funds land."
              : "One tap. No signature, no real money."}
          </Text>
          {hasRequestedFaucet ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <PillButton title="Get testnet funds" onPress={handleFaucet} loading={isFauceting} />
          )}
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

      {needsRecovery && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trading key needs attention</Text>
          <Text style={styles.cardBody}>
            {keyStale
              ? "The server's key was rejected as an invalid signature — most likely stale from an earlier authorization."
              : accountMismatch
                ? `The server is signing for account ${serverConfig?.accountIndex}, not yours (${account?.index}).`
                : "The server hasn't adopted a trading key for this account yet."}{" "}
            Re-authorize to register a fresh one — the server adopts it automatically, no manual step needed.
          </Text>
          {hasSignedThisSession ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <PillButton title="Re-authorize" onPress={confirmReauthorize} loading={isRegistering} />
          )}
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
