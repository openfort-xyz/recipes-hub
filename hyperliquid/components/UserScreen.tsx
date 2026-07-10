import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEmbeddedEthereumWallet, useSignOut, useUser } from "@openfort/react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

import { CreateWalletScreen } from "./onboarding/CreateWalletScreen";
import { FundHyperliquidScreen } from "./onboarding/FundHyperliquidScreen";
import { MainAppScreen } from "./MainAppScreen";
import { colors } from "./ui";
import { useWalletBalance } from "../hooks/useUserBalances";
import { useHypeBalances, useHypeUsdc } from "../services/HyperliquidClient";
import { transactionHandlers } from "../utils/transactions";

const ONBOARDING_SCREENS = ["create-wallet", "fund-exchange"] as const;
type OnboardingScreen = (typeof ONBOARDING_SCREENS)[number];
type Screen = OnboardingScreen | "trading";

const TOTAL_STEP_COUNT = ONBOARDING_SCREENS.length;

const PLACEHOLDER_HYPERLIQUID_ADDRESS = "0x_your_hyperliquid_wallet_address";

export const UserScreen: React.FC = () => {
  const { user } = useUser();
  const wallets = useEmbeddedEthereumWallet();
  const { activeWallet } = wallets;
  const insets = useSafeAreaInsets();
  const { signOut } = useSignOut();

  const [currentScreen, setCurrentScreen] = useState<Screen>("create-wallet");
  const [prevScreen, setPrevScreen] = useState<Screen>(currentScreen);
  const [hasRequestedWalletCreation, setHasRequestedWalletCreation] = useState(false);
  const [walletCreationError, setWalletCreationError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // "Adjusting state when a prop/value changes" computed during render instead
  // of an effect — https://react.dev/learn/you-might-not-need-an-effect.
  if (currentScreen !== prevScreen) {
    setPrevScreen(currentScreen);
    if (currentScreen !== "create-wallet") {
      setHasRequestedWalletCreation(false);
      setWalletCreationError(null);
    }
  }

  // The configured HYPERLIQUID_WALLET_ADDRESS is only needed for the advanced
  // "trade on behalf of an existing account" flow (see AGENTS.md). By default,
  // the embedded wallet trades and holds funds on its own Hyperliquid account.
  const configuredHyperliquidAddress = Constants.expoConfig?.extra?.hyperliquidWalletAddress as string | undefined;
  const hyperliquidAccountAddress = useMemo(() => {
    if (configuredHyperliquidAddress && configuredHyperliquidAddress !== PLACEHOLDER_HYPERLIQUID_ADDRESS) {
      return configuredHyperliquidAddress as `0x${string}`;
    }
    return activeWallet?.address as `0x${string}` | undefined;
  }, [configuredHyperliquidAddress, activeWallet?.address]);

  const { price: hypeUsdcPrice, isLoading: hypeUsdcLoading } = useHypeUsdc();
  const {
    balances: hypeBalances,
    isLoading: hypeBalancesLoading,
    refetch: refetchHypeBalances,
  } = useHypeBalances(hyperliquidAccountAddress);
  const {
    balance: walletBalance,
    loading: walletBalanceLoading,
    refetch: refetchWalletBalance,
  } = useWalletBalance(activeWallet?.address);

  const onboardingStep = useMemo(() => {
    if (currentScreen === "trading") return TOTAL_STEP_COUNT;
    const index = ONBOARDING_SCREENS.indexOf(currentScreen as OnboardingScreen);
    return index >= 0 ? index + 1 : TOTAL_STEP_COUNT;
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen !== "fund-exchange") {
      return undefined;
    }
    const interval = setInterval(() => {
      refetchWalletBalance();
      refetchHypeBalances();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentScreen, refetchWalletBalance, refetchHypeBalances]);

  const handleCreateWallet = useCallback(() => {
    setWalletCreationError(null);
    setHasRequestedWalletCreation(true);
    wallets.create({
      recoveryPassword: "password",
      onError: (error: any) => {
        const message = error?.message ?? "Please try again later.";
        setWalletCreationError(message);
        Alert.alert(
          "Wallet Creation Failed",
          message,
          [
            { text: "Retry", onPress: () => setHasRequestedWalletCreation(false) },
            { text: "Dismiss", style: "cancel" },
          ],
        );
      },
      onSuccess: ({ wallet }: any) => {
        console.log("Wallet created", wallet);
      },
    });
  }, [wallets]);

  useEffect(() => {
    if (currentScreen === "create-wallet" && !activeWallet && !hasRequestedWalletCreation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off an imperative SDK call (wallets.create) when this screen has no wallet yet; this is exactly what effects synchronize with external systems for.
      handleCreateWallet();
    }
  }, [currentScreen, activeWallet, hasRequestedWalletCreation, handleCreateWallet]);

  const handleTransfer = useCallback(
    async (amount: string) => {
      if (!activeWallet) return false;
      return transactionHandlers.handleTransfer(
        amount,
        walletBalance,
        activeWallet,
        setIsTransferring,
        () => {},
        () => {
          refetchWalletBalance();
          refetchHypeBalances();
        }
      );
    },
    [activeWallet, walletBalance, refetchWalletBalance, refetchHypeBalances]
  );

  const handleContinueToTrading = useCallback(() => setCurrentScreen("trading"), []);
  const handleContinueToFunding = useCallback(() => setCurrentScreen("fund-exchange"), []);

  const logoutButton = (
    <TouchableOpacity onPress={() => signOut()} style={[styles.logoutButton, { top: insets.top + 10 }]}>
      <Text style={styles.logoutText}>Log out</Text>
    </TouchableOpacity>
  );

  if (!user) {
    return null;
  }

  switch (currentScreen) {
    case "create-wallet":
      return (
        <View style={styles.screenWrapper}>
          {logoutButton}
          <CreateWalletScreen
            isCreating={false}
            step={onboardingStep}
            totalSteps={TOTAL_STEP_COUNT}
            walletOwnerAddress={activeWallet?.address}
            onContinue={handleContinueToFunding}
            errorMessage={walletCreationError ?? undefined}
            onRetryCreateWallet={handleCreateWallet}
          />
        </View>
      );
    case "fund-exchange":
      return (
        <View style={styles.screenWrapper}>
          {logoutButton}
          <FundHyperliquidScreen
            walletAddress={activeWallet?.address}
            hyperliquidAddress={hyperliquidAccountAddress}
            walletBalance={walletBalance}
            hyperliquidBalance={Number(hypeBalances?.account?.usdcBalance ?? 0)}
            isLoading={walletBalanceLoading || hypeBalancesLoading}
            onContinue={handleContinueToTrading}
            onTransfer={handleTransfer}
            isTransferring={isTransferring}
            step={onboardingStep}
            totalSteps={TOTAL_STEP_COUNT}
          />
        </View>
      );
    case "trading":
    default:
      return (
        <View style={styles.screenWrapper}>
          {logoutButton}
          <MainAppScreen
            activeWallet={activeWallet}
            walletBalance={walletBalance}
            walletBalanceLoading={walletBalanceLoading}
            hypeBalances={hypeBalances}
            hypeBalancesLoading={hypeBalancesLoading}
            refetchWalletBalance={refetchWalletBalance}
            refetchHypeBalances={refetchHypeBalances}
            hypeUsdcPrice={hypeUsdcPrice}
            hypeUsdcLoading={hypeUsdcLoading}
            hyperliquidAccountAddress={hyperliquidAccountAddress}
          />
        </View>
      );
  }
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    position: "relative",
  },
  logoutButton: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  logoutText: {
    color: colors.negative,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
