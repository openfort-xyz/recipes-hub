import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PillButton } from "../ui";
import { COLORS, RADII } from "../../constants/theme";

interface CreateWalletScreenProps {
  isCreating: boolean;
  walletAddress?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onContinue?: () => void;
}

export function CreateWalletScreen({
  isCreating,
  walletAddress,
  errorMessage,
  onRetry,
  onContinue,
}: CreateWalletScreenProps) {
  const [copied, setCopied] = useState(false);
  const [lastAddress, setLastAddress] = useState(walletAddress);
  if (walletAddress !== lastAddress) {
    setLastAddress(walletAddress);
    setCopied(false);
  }

  const copyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
    }
  };

  const truncated = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{walletAddress ? "Wallet ready" : "Setting up your wallet"}</Text>
        <Text style={styles.subtitle}>
          {walletAddress
            ? "This Ethereum mainnet address is your Lighter account owner. Continue to fund it."
            : "Openfort is provisioning your embedded wallet on Ethereum mainnet."}
        </Text>

        <View style={styles.card}>
          {errorMessage ? (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>Couldn&apos;t create your wallet</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {onRetry && <PillButton title="Try again" onPress={onRetry} style={styles.retryButton} />}
            </View>
          ) : walletAddress ? (
            <View style={styles.addressRow}>
              <Text style={styles.address}>{truncated}</Text>
              <TouchableOpacity onPress={copyAddress} style={styles.copyButton}>
                <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.progressText}>{isCreating ? "Generating keys…" : "Preparing…"}</Text>
            </View>
          )}
        </View>

        {walletAddress && onContinue && <PillButton title="Continue" onPress={onContinue} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 96,
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
  card: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    minHeight: 96,
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 12,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  address: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: "Courier",
  },
  copyButton: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: RADII.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyText: {
    color: COLORS.accent,
    fontWeight: "600",
    fontSize: 13,
  },
  errorTitle: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
  retryButton: {
    marginTop: 8,
  },
});
