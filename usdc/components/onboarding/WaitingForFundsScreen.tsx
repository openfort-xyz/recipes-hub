import React from "react";
import { ActivityIndicator, ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { UserWallet, WalletData } from "@/types/wallet";
import { formatUSDC } from "../../utils/format";
import { ERC20_BALANCE_TIMEOUT_MS } from "../../constants/erc20";
import { useUsdcBalance } from "../../utils/erc20";
import { colors, radii } from "../../constants/theme";

interface Props {
  walletB: WalletData | null;
  onNext: () => void;
  onBack: () => void;
  onUpdateBalance: (balance: string) => void;
  activeWallet: UserWallet | null;
}

const truncateAddress = (address: string) =>
  address ? `${address.slice(0, 6)}···${address.slice(-4)}` : "";

export const WaitingForFundsScreen = ({ walletB, onNext, onBack, onUpdateBalance, activeWallet }: Props) => {
  const { balance: currentBalance, hasBalance } = useUsdcBalance({
    activeWalletOrProvider: activeWallet,
    ownerAddress: walletB?.address,
    onBalanceUpdate: onUpdateBalance,
    options: { pollIntervalMs: 5000, stopWhenPositive: true, timeoutMs: ERC20_BALANCE_TIMEOUT_MS },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{hasBalance ? "Funds received" : "Waiting for funds"}</Text>

          <Text style={[styles.amount, hasBalance && styles.amountSuccess]} numberOfLines={1} adjustsFontSizeToFit>
            ${formatUSDC(currentBalance)}
          </Text>
          <Text style={styles.currency}>USDC · Ethereum Sepolia</Text>

          <View style={[styles.statusChip, hasBalance && styles.statusChipSuccess]}>
            {hasBalance ? (
              <>
                <View style={styles.checkBadge}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <Text style={styles.statusTextSuccess}>Ready to go</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.statusText}>Checking balance…</Text>
              </>
            )}
          </View>
        </View>

        <Pressable
          style={styles.addressChip}
          onPress={() => Clipboard.setStringAsync(walletB?.address || "")}
        >
          <Text style={styles.addressLabel}>Wallet B</Text>
          <Text style={styles.addressText}>{truncateAddress(walletB?.address || "")}</Text>
        </Pressable>

        {!hasBalance ? (
          <Text style={styles.hint}>Circle usually delivers within 30–60 seconds. Tap the address to copy it.</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {hasBalance ? (
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={onNext}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable style={({ pressed }) => [styles.ghostButton, pressed && styles.buttonPressed]} onPress={onBack}>
            <Text style={styles.ghostButtonText}>Back to faucet</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: 40,
  },
  eyebrow: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 12,
  },
  amount: {
    fontSize: 68,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  amountSuccess: {
    color: colors.greenPressed,
  },
  currency: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 6,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  statusChipSuccess: {
    backgroundColor: colors.greenSoft,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
  },
  statusTextSuccess: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.greenPressed,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  checkIcon: {
    color: colors.onGreen,
    fontSize: 12,
    fontWeight: "800",
  },
  addressChip: {
    alignSelf: "center",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.card,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  footer: {
    padding: 24,
    paddingTop: 8,
  },
  primaryButton: {
    height: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    backgroundColor: colors.greenPressed,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: colors.onGreen,
    fontSize: 18,
    fontWeight: "700",
  },
  ghostButton: {
    height: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
