import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from 'expo-clipboard';

import { GradientButton } from "../ui";

interface FundHyperliquidScreenProps {
  walletAddress?: string;
  hyperliquidAddress?: string;
  walletBalance?: number | null;
  hyperliquidBalance?: number | null;
  isLoading: boolean;
  onContinue: () => void;
  step: number;
  totalSteps: number;
}

export const FundHyperliquidScreen: React.FC<FundHyperliquidScreenProps> = ({
  walletAddress,
  hyperliquidAddress,
  walletBalance,
  hyperliquidBalance,
  isLoading,
  onContinue,
  step,
  totalSteps,
}) => {
  const truncatedHyperliquid = React.useMemo(() => {
    if (!hyperliquidAddress) return null;
    return `${hyperliquidAddress.slice(0, 6)}…${hyperliquidAddress.slice(-4)}`;
  }, [hyperliquidAddress]);

  const hasExchangeBalance = (hyperliquidBalance ?? 0) > 0;

  const copyToClipboard = async () => {
    if (hyperliquidAddress) {
      await Clipboard.setStringAsync(hyperliquidAddress);
    }
  };

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
          <Text style={styles.title}>Add balance</Text>
          <Text style={styles.subtitle}>
            Your Hyperliquid wallet already has USDC available for trading. Continue when ready.
          </Text>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>USDC (Spot) Balance</Text>
            <View style={styles.statusValueRow}>
              <Text style={styles.statusValue}>{`${hyperliquidBalance?.toFixed(8) ?? "0.00000000"} USDC`}</Text>
              <Text style={[styles.statusBadge, hasExchangeBalance ? styles.readyBadge : styles.pendingBadge]}>
                {hasExchangeBalance ? "Ready" : "No Funds"}
              </Text>
            </View>
            <Text style={styles.statusHint}>Your Hyperliquid account USDC balance available for trading.</Text>
          </View>
        </View>

        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Hyperliquid wallet address</Text>
          <View style={styles.addressRow}>
            <Text style={styles.addressValue}>{truncatedHyperliquid ?? "—"}</Text>
            {hyperliquidAddress && (
              <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.addressHint}>This is your Hyperliquid account address where USDC balances are held.</Text>
        </View>

        <View style={styles.card}>
          <GradientButton
            title={hasExchangeBalance ? "Continue to trading" : "I have funded my account"}
            onPress={onContinue}
          />
        </View>
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
    paddingBottom: 48,
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
  statusRow: {
    flexDirection: "row",
    gap: 20,
    flexWrap: "wrap",
  },
  statusCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(26, 31, 46, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 12,
  },
  statusLabel: {
    color: "#8B949E",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  statusValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  readyBadge: {
    backgroundColor: "rgba(0, 212, 170, 0.12)",
    color: "#00D4AA",
  },
  pendingBadge: {
    backgroundColor: "rgba(255, 199, 0, 0.12)",
    color: "#FCD34D",
  },
  statusHint: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },
  addressCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(26, 31, 46, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 10,
  },
  addressLabel: {
    color: "#8B949E",
    fontSize: 13,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "monospace",
    flex: 1,
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
  addressHint: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "rgba(26, 31, 46, 0.9)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 20,
  },
  callout: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressText: {
    color: "#8B949E",
    fontSize: 14,
  },
});
