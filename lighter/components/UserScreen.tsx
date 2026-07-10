import { useEmbeddedEthereumWallet } from "@openfort/react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { CreateWalletScreen } from "./onboarding/CreateWalletScreen";
import { OnboardingStatusScreen } from "./onboarding/OnboardingStatusScreen";
import { TradingScreen } from "./TradingScreen";
import { WithdrawScreen } from "./WithdrawScreen";
import { COLORS } from "../constants/theme";
import { fetchAccount, type LighterAccount } from "../services/lighterServerClient";
import { L1_CHAIN_ID } from "../constants/network";

type Screen = "onboarding" | "trading" | "withdraw";

export function UserScreen() {
  const ethereum = useEmbeddedEthereumWallet({ chainId: L1_CHAIN_ID });
  const [view, setView] = useState<Screen>("onboarding");
  const [account, setAccount] = useState<LighterAccount | null>(null);

  const hasTriggeredCreate = React.useRef(false);
  useEffect(() => {
    if (ethereum.status === "disconnected" && ethereum.wallets.length === 0 && !hasTriggeredCreate.current) {
      hasTriggeredCreate.current = true;
      ethereum.create({ chainId: L1_CHAIN_ID }).catch((err) => {
        console.error("Wallet creation failed:", err);
      });
    }
    if (ethereum.status === "disconnected" && ethereum.wallets.length > 0) {
      const [firstWallet] = ethereum.wallets;
      if (firstWallet) {
        ethereum.setActive({ address: firstWallet.address as `0x${string}`, chainId: L1_CHAIN_ID }).catch((err) => {
          console.error("Wallet activation failed:", err);
        });
      }
    }
  }, [ethereum]);

  const refreshAccount = React.useCallback(async () => {
    if (ethereum.status !== "connected") return;
    try {
      const result = await fetchAccount(ethereum.activeWallet.address);
      setAccount(result.account);
    } catch (err) {
      console.error("Failed to refresh account:", err);
    }
  }, [ethereum]);

  useEffect(() => {
    // See hooks/useLighterMarket.ts for why this is exempted from set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAccount();
  }, [refreshAccount]);

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

  const walletAddress = ethereum.activeWallet.address as `0x${string}`;

  if (view === "onboarding" || !account) {
    return (
      <OnboardingStatusScreen
        walletAddress={walletAddress}
        provider={ethereum.provider}
        onReady={async () => {
          await refreshAccount();
          setView("trading");
        }}
      />
    );
  }

  if (view === "withdraw") {
    return (
      <WithdrawScreen
        account={account}
        onBack={() => setView("trading")}
        onRefreshAccount={refreshAccount}
      />
    );
  }

  return (
    <TradingScreen account={account} onOpenWithdraw={() => setView("withdraw")} onRefreshAccount={refreshAccount} />
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
