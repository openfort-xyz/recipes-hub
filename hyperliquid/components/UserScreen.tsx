import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEmbeddedEthereumWallet, useOpenfort, useOpenfortClient, useSignOut, useUser } from "@openfort/react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

import { CreateWalletScreen } from "./onboarding/CreateWalletScreen";
import { FundHyperliquidScreen } from "./onboarding/FundHyperliquidScreen";
import { MainAppScreen } from "./MainAppScreen";
import { useWalletBalance } from "../hooks/useUserBalances";
import { useHypeBalances, useHypeUsdc } from "../services/HyperliquidClient";

const ONBOARDING_SCREENS = ["create-wallet", "fund-exchange"] as const;
type OnboardingScreen = (typeof ONBOARDING_SCREENS)[number];
type Screen = OnboardingScreen | "trading";

const TOTAL_STEP_COUNT = ONBOARDING_SCREENS.length;

export const UserScreen: React.FC = () => {
  const { user } = useUser();
  const openfortClient = useOpenfortClient();
  const wallets = useEmbeddedEthereumWallet();
  const { activeWallet } = wallets;
  const insets = useSafeAreaInsets();
  const { signOut } = useSignOut();

  const [currentScreen, setCurrentScreen] = useState<Screen>("create-wallet");
  const [hasRequestedWalletCreation, setHasRequestedWalletCreation] = useState(false);
  const [walletCreationError, setWalletCreationError] = useState<string | null>(null);

  const hyperliquidAccountAddress = useMemo(() => {
    const address = Constants.expoConfig?.extra?.hyperliquidWalletAddress as `0x${string}`;
    return address;
  }, [Constants.expoConfig?.extra?.hyperliquidWalletAddress]);

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
    if (currentScreen === "fund-exchange") {
      refetchWalletBalance();
      refetchHypeBalances();
      const interval = setInterval(() => {
        refetchWalletBalance();
        refetchHypeBalances();
      }, 5000);
      return () => clearInterval(interval);
    }
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
            {
              text: "Retry",
              onPress: () => setHasRequestedWalletCreation(false),
            },
            {
              text: "Dismiss",
              style: "cancel",
            },
          ],
        );
      },
      onSuccess: ({ wallet }: any) => {
        console.log("Wallet created", wallet);
      },
    });
  }, [wallets]);

  useEffect(() => {
    if (
      currentScreen === "create-wallet" &&
      !activeWallet &&
      !hasRequestedWalletCreation
    ) {
      handleCreateWallet();
    }
  }, [
    currentScreen,
    activeWallet,
    hasRequestedWalletCreation,
    handleCreateWallet,
  ]);

  useEffect(() => {
    if (currentScreen !== "create-wallet") {
      setHasRequestedWalletCreation(false);
      setWalletCreationError(null);
    }
  }, [currentScreen]);

  const handleContinueToTrading = useCallback(() => {
    setCurrentScreen("trading");
  }, []);

  const handleContinueToFunding = useCallback(() => {
    setCurrentScreen("fund-exchange");
  }, []);

  const logoutButton = (
    <TouchableOpacity onPress={() => signOut()} style={[styles.logoutButton, { top: insets.top + 10 }]}>
      <Text style={styles.logoutText}>Logout</Text>
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
            walletOwnerAddress={activeWallet?.ownerAddress}
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
            openfortClient={openfortClient}
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
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(15, 20, 25, 0.6)",
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
