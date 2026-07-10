import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Keypad, PillButton } from "./ui";
import { COLORS, RADII } from "../constants/theme";
import { withdrawUsdc } from "../services/lighterServerClient";
import type { LighterAccount } from "../services/lighterServerClient";

interface WithdrawScreenProps {
  account: LighterAccount | null;
  onBack: () => void;
  onRefreshAccount: () => void;
}

const WITHDRAW_MIN_USDC = 1; // apidocs.lighter.xyz: "Secure Withdrawals: 1 USDC minimum"

export function WithdrawScreen({ account, onBack, onRefreshAccount }: WithdrawScreenProps) {
  const [amount, setAmount] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const available = account ? Number.parseFloat(account.available_balance) : 0;

  const handleWithdraw = async () => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < WITHDRAW_MIN_USDC) {
      Alert.alert("Invalid amount", `Minimum withdrawal is ${WITHDRAW_MIN_USDC} USDC.`);
      return;
    }
    if (parsed > available) {
      Alert.alert("Insufficient balance", "Withdrawal amount exceeds available balance.");
      return;
    }
    setIsSubmitting(true);
    try {
      const amountRaw = Math.round(parsed * 1_000_000); // USDC has 6 decimals
      const result = await withdrawUsdc(amountRaw);
      setTxHash(result.txHash);
      onRefreshAccount();
    } catch (err) {
      Alert.alert("Withdrawal failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (txHash) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Withdrawal submitted</Text>
          <Text style={styles.subtitle}>
            Funds are on their way to your own wallet address — Lighter only allows withdrawals to the account
            owner&apos;s registered L1 address.
          </Text>
          <Text style={styles.hash} numberOfLines={1}>
            {txHash}
          </Text>
          <PillButton title="Done" onPress={onBack} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Withdraw</Text>
        <Text style={styles.subtitle}>Always goes to your own wallet: {account?.l1_address ?? "—"}</Text>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Available</Text>
          <Text style={styles.balanceValue}>${available.toFixed(2)}</Text>
        </View>

        <Text style={styles.amountDisplay}>${amount}</Text>
        <Keypad value={amount} onChange={setAmount} maxDecimals={2} />

        <View style={styles.actions}>
          <PillButton title="Cancel" onPress={onBack} variant="secondary" style={styles.actionButton} disabled={isSubmitting} />
          <PillButton
            title="Withdraw"
            onPress={handleWithdraw}
            loading={isSubmitting}
            style={styles.actionButton}
          />
        </View>
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
    paddingTop: 80,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  balanceValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  amountDisplay: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
  hash: {
    color: COLORS.textTertiary,
    fontFamily: "Courier",
    fontSize: 11,
  },
});
