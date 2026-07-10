import { EmbeddedState, useEmbeddedEthereumWallet, useOpenfortContext } from "@openfort/react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AssetSelectScreen } from "./AssetSelectScreen";
import { CreateWalletScreen } from "./onboarding/CreateWalletScreen";
import { OnboardingStatusScreen } from "./onboarding/OnboardingStatusScreen";
import { TradingScreen } from "./TradingScreen";
import { WithdrawScreen } from "./WithdrawScreen";
import { COLORS } from "../constants/theme";
import { useLighterOnboarding } from "../hooks/useLighterOnboarding";
import type { Market } from "../services/lighterServerClient";
import { L1_CHAIN_ID } from "../constants/network";

// How long "disconnected + no wallets" must hold steady before it's trusted as final rather than
// a snapshot mid-restore — see the effect below for why a single render isn't enough.
const WALLET_SETTLE_MS = 1500;

export function UserScreen() {
  const ethereum = useEmbeddedEthereumWallet({ chainId: L1_CHAIN_ID });
  const { embeddedState } = useOpenfortContext();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  // Set when an order fails with Lighter's invalid-signature code — deriveStep can't detect a
  // stale server key on its own (apiKeys.length and accountIndex both still look fine; only the
  // actual on-chain key changed under it via a second ChangePubKey submit). Forces the onboarding
  // screen open with a dedicated recovery card regardless of what step currently computes to.
  // Auto-clears once the underlying data genuinely reaches "ready" again (i.e. the operator
  // restarted the server with a working key).
  const [keyStale, setKeyStale] = useState(false);

  const hasTriggeredCreate = React.useRef(false);
  useEffect(() => {
    // embeddedState starts at NONE (the SDK's own pre-restore placeholder) and settling past it
    // is necessary but NOT sufficient: embeddedState can reach READY while the separate
    // embeddedAccounts fetch (which produces `wallets`) is still in flight, briefly reporting
    // "disconnected" + empty wallets — indistinguishable from genuinely having no wallet. Verified
    // live (see FRICTION_LOG.md): embeddedState was already 4 (READY) on the very first render
    // with walletsLen still 0. Rather than chase the SDK's exact internal ordering, wait for this
    // snapshot to hold steady for a settle window before trusting it — any subsequent state change
    // (the fetch resolving, embeddedState moving again) cancels this timer via the effect cleanup.
    if (embeddedState === EmbeddedState.NONE) {
      return;
    }
    if (ethereum.status === "disconnected" && ethereum.wallets.length === 0 && !hasTriggeredCreate.current) {
      const timer = setTimeout(() => {
        hasTriggeredCreate.current = true;
        ethereum.create({ chainId: L1_CHAIN_ID }).catch((err) => {
          console.error("Wallet creation failed:", err);
        });
      }, WALLET_SETTLE_MS);
      return () => clearTimeout(timer);
    }
    if (ethereum.status === "disconnected" && ethereum.wallets.length > 0) {
      const [firstWallet] = ethereum.wallets;
      if (firstWallet) {
        ethereum.setActive({ address: firstWallet.address as `0x${string}`, chainId: L1_CHAIN_ID }).catch((err) => {
          console.error("Wallet activation failed:", err instanceof Error ? err.message : String(err));
        });
      }
    }
  }, [ethereum, embeddedState]);

  const walletAddress = ethereum.status === "connected" ? (ethereum.activeWallet.address as `0x${string}`) : undefined;
  // Single source of truth for account/apiKeys/serverConfig/readiness — previously UserScreen and
  // OnboardingStatusScreen each ran their own separate fetch of the same data, which could drift
  // out of sync during a wallet-address change (one still showing a stale, already-registered
  // account's data while the other had moved on) and let an unregistered/mismatched account slip
  // through to trading. Polls continuously, not just on mount, so the gate re-evaluates from live
  // data on every render — including regressing back to onboarding if it ever stops being ready.
  const onboarding = useLighterOnboarding(walletAddress);

  // Adjusting state during render (React's recommended pattern for "reset when an input
  // changes") rather than in an effect — this only fires on the render where step actually
  // transitions to "ready", not on every render where it happens to already be "ready".
  const [prevOnboardingStep, setPrevOnboardingStep] = useState(onboarding.step);
  if (onboarding.step !== prevOnboardingStep) {
    setPrevOnboardingStep(onboarding.step);
    if (onboarding.step === "ready" && keyStale) {
      setKeyStale(false);
    }
  }

  if (ethereum.status === "error") {
    return (
      <CreateWalletScreen
        isCreating={false}
        errorMessage={ethereum.error}
        onRetry={() => ethereum.create({ chainId: L1_CHAIN_ID })}
      />
    );
  }

  if (ethereum.status === "creating" || ethereum.status === "connecting" || ethereum.status === "reconnecting" || ethereum.status === "fetching-wallets") {
    return <CreateWalletScreen isCreating={ethereum.status === "creating"} />;
  }

  if (ethereum.status === "needs-recovery") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.centeredText}>Recovering your wallet…</Text>
      </View>
    );
  }

  if (ethereum.status !== "connected") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (onboarding.step !== "ready" || keyStale) {
    return (
      <OnboardingStatusScreen
        walletAddress={ethereum.activeWallet.address as `0x${string}`}
        provider={ethereum.provider}
        onboarding={onboarding}
        keyStale={keyStale}
      />
    );
  }

  const { account } = onboarding;
  if (!account) {
    // Should be unreachable — deriveStep requires a non-null account to reach "ready" — but
    // never trust that invariant across a function boundary without a runtime check.
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (showWithdraw) {
    return <WithdrawScreen account={account} onBack={() => setShowWithdraw(false)} onRefreshAccount={onboarding.refresh} />;
  }

  if (!selectedMarket) {
    return <AssetSelectScreen account={account} onSelect={setSelectedMarket} onWithdraw={() => setShowWithdraw(true)} />;
  }

  return (
    <TradingScreen
      market={selectedMarket}
      accountIndex={account.index}
      onBack={() => setSelectedMarket(null)}
      onRefreshAccount={onboarding.refresh}
      onKeyStale={() => setKeyStale(true)}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centeredText: {
    color: COLORS.textSecondary,
  },
});
