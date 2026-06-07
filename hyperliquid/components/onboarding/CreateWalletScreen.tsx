import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from 'expo-clipboard';

import { GradientButton } from "../ui";

interface CreateWalletScreenProps {
  isCreating: boolean;
  step: number;
  totalSteps: number;
  walletOwnerAddress?: string;
  onContinue?: () => void;
  errorMessage?: string;
  onRetryCreateWallet?: () => void;
}

export const CreateWalletScreen: React.FC<CreateWalletScreenProps> = ({
  isCreating,
  step,
  totalSteps,
  walletOwnerAddress,
  onContinue,
  errorMessage,
  onRetryCreateWallet,
}) => {
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    setHasCopied(false);
  }, [walletOwnerAddress]);

  const copyToClipboard = async () => {
    if (walletOwnerAddress) {
      await Clipboard.setStringAsync(walletOwnerAddress);
      setHasCopied(true);
    }
  };

  const truncatedOwnerAddress = walletOwnerAddress
    ? `${walletOwnerAddress.slice(0, 6)}...${walletOwnerAddress.slice(-4)}`
    : "";

  const isWalletCreated = !!walletOwnerAddress;
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F1419", "#1A1F2E", "#0F1419"]}
        style={styles.backgroundGradient}
      />

      <View style={styles.content}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>Step {step} of {totalSteps}</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>
            {isWalletCreated ? "Wallet Created Successfully!" : "Setting up your trading wallet"}
          </Text>
          <Text style={styles.subtitle}>
            {isWalletCreated
              ? "Your trading wallet has been created. Copy the address below and add it to Hyperliquid testnet API."
              : "We are provisioning an embedded Openfort wallet that Hyperliquid will use for signing trades."}
          </Text>
        </View>

        <View style={styles.card}>
          {isWalletCreated ? (
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>Address</Text>
              <View style={styles.addressContainer}>
                <Text style={styles.addressText}>{truncatedOwnerAddress}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
                  <Text style={styles.copyButtonText}>{hasCopied ? "Copied!" : "Copy"}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>Next Steps:</Text>
                <Text style={styles.instructionsText}>
                  1. Copy the address above{"\n"}
                  2. Go to{" "}
                  <Text style={styles.linkText}>https://app.hyperliquid-testnet.xyz/API</Text>
                  {"\n"}
                  3. Add this address as an API wallet{"\n"}
                  4. You can then proceed with trading
                </Text>
              </View>
              {hasCopied && onContinue && (
                <GradientButton
                  title="Continue to Next Step"
                  onPress={onContinue}
                />
              )}
            </View>
          ) : (
            <View style={styles.pendingContent}>
              {errorMessage ? (
                <>
                  <Text style={styles.errorTitle}>We could not create your wallet</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                  {onRetryCreateWallet && (
                    <GradientButton
                      title="Try Again"
                      onPress={onRetryCreateWallet}
                    />
                  )}
                </>
              ) : (
                <View style={styles.progressRow}>
                  <ActivityIndicator color="#00D4AA" />
                  <Text style={styles.progressText}>
                    {isCreating ? "Generating secure keys…" : "Preparing your wallet…"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Text style={styles.hint}>
          {isWalletCreated
            ? "This wallet address lives on Arbitrum Sepolia and will be used for trading on Hyperliquid."
            : "The wallet address lives on Arbitrum Sepolia and will be re-used for the rest of this flow."}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1419",
  },
  backgroundGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 96,
    gap: 32,
  },
  stepBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0, 212, 170, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.35)",
  },
  stepText: {
    color: "#00D4AA",
    fontWeight: "600",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  header: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16,
    color: "#8B949E",
    lineHeight: 24,
  },
  card: {
    backgroundColor: "rgba(26, 31, 46, 0.9)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  progressText: {
    color: "#8B949E",
    fontSize: 14,
    textAlign: "center",
  },
  pendingContent: {
    gap: 20,
    alignItems: "center",
  },
  hint: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  successContent: {
    gap: 20,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00D4AA",
    textAlign: "center",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 212, 170, 0.08)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.2)",
  },
  addressText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "monospace",
  },
  copyButton: {
    backgroundColor: "rgba(0, 212, 170, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.35)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  copyButtonText: {
    color: "#00D4AA",
    fontSize: 12,
    fontWeight: "600",
  },
  instructionsContainer: {
    backgroundColor: "rgba(139, 148, 158, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 148, 158, 0.1)",
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: "#8B949E",
    lineHeight: 20,
  },
  linkText: {
    color: "#00D4AA",
    textDecorationLine: "underline",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F87171",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#FCA5A5",
    textAlign: "center",
    lineHeight: 20,
  },
});
