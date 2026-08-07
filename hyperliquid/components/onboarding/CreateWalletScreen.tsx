import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { Card, PillButton, colors, spacing } from "../ui";

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
  const [copiedForAddress, setCopiedForAddress] = useState<string | undefined>(undefined);

  // "Adjusting state when a prop changes" — computed during render instead of an
  // effect, per https://react.dev/learn/you-might-not-need-an-effect.
  if (copiedForAddress !== walletOwnerAddress) {
    setCopiedForAddress(walletOwnerAddress);
    if (hasCopied) setHasCopied(false);
  }

  const copyToClipboard = async () => {
    if (walletOwnerAddress) {
      await Clipboard.setStringAsync(walletOwnerAddress);
      setHasCopied(true);
    }
  };

  const truncatedOwnerAddress = useMemo(
    () => (walletOwnerAddress ? `${walletOwnerAddress.slice(0, 6)}…${walletOwnerAddress.slice(-4)}` : ""),
    [walletOwnerAddress]
  );

  const isWalletCreated = !!walletOwnerAddress;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>
            Step {step} of {totalSteps}
          </Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{isWalletCreated ? "Wallet ready" : "Setting up your wallet"}</Text>
          <Text style={styles.subtitle}>
            {isWalletCreated
              ? "This embedded wallet trades HYPE/USDC directly — no separate account setup needed."
              : "Provisioning an Openfort embedded wallet on Arbitrum Sepolia."}
          </Text>
        </View>

        <Card style={styles.card}>
          {isWalletCreated ? (
            <View style={styles.successContent}>
              <Text style={styles.successLabel}>Address</Text>
              <View style={styles.addressRow}>
                <Text style={styles.addressText}>{truncatedOwnerAddress}</Text>
                <PillButton
                  title={hasCopied ? "Copied" : "Copy"}
                  onPress={copyToClipboard}
                  variant="secondary"
                  style={styles.copyButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.pendingContent}>
              {errorMessage ? (
                <>
                  <Text style={styles.errorTitle}>Couldn&apos;t create your wallet</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                  {onRetryCreateWallet && <PillButton title="Try again" onPress={onRetryCreateWallet} />}
                </>
              ) : (
                <View style={styles.progressRow}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.progressText}>
                    {isCreating ? "Generating secure keys…" : "Preparing your wallet…"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {isWalletCreated && onContinue && <PillButton title="Continue" onPress={onContinue} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 96,
    gap: spacing.xl,
  },
  stepBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentMuted,
  },
  stepText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    gap: spacing.md,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  pendingContent: {
    gap: spacing.md,
    alignItems: "center",
  },
  successContent: {
    gap: spacing.sm,
  },
  successLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  addressText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  copyButton: {
    width: "auto",
    height: 40,
    paddingHorizontal: spacing.md,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.negative,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
