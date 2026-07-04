// components/MainAppScreen.tsx
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View, StyleSheet, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { WalletData } from "@/types/wallet";
import { formatUSDC } from "../utils/format";
import { transferUSDC } from "../utils/erc20";
import { CHAIN_IDS, CHAIN_IDS_HEX } from "../constants/network";
import { ConnectedEmbeddedEthereumWallet } from "@openfort/react-native";
import { colors, radii, cardShadow, avatarColor } from "../constants/theme";

interface MainAppScreenProps {
  walletA: WalletData | null;
  walletB: WalletData | null;
  transferAmount: string;
  setTransferAmount: (amount: string) => void;
  isTransferring: boolean;
  setIsTransferring: (transferring: boolean) => void;
  isInitialLoad: boolean;
  updateBalances: () => Promise<void>;
  logout: () => void;
  ethBalances: { [key: string]: string };
  activeWallet: ConnectedEmbeddedEthereumWallet | null;
  setActiveWallet: (options?: any) => Promise<any>;
}

const truncate = (address?: string) =>
  address ? `${address.slice(0, 6)}···${address.slice(-4)}` : "";

export const MainAppScreen = ({
  walletA,
  walletB,
  transferAmount,
  setTransferAmount,
  isTransferring,
  setIsTransferring,
  isInitialLoad,
  updateBalances,
  logout,
  ethBalances,
  activeWallet,
  setActiveWallet,
}: MainAppScreenProps) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const isA = activeWallet?.address === walletA?.address;
  const sender = isA ? walletA : walletB;
  const receiver = isA ? walletB : walletA;
  const senderLabel = isA ? "Wallet A" : "Wallet B";
  const receiverLabel = isA ? "Wallet B" : "Wallet A";
  const gas = ethBalances[activeWallet?.address || ""] || "0";

  const senderBalance = isInitialLoad && !sender?.balance ? null : formatUSDC(sender?.balance || "0");

  const copyToClipboard = useCallback(async (address?: string) => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1500);
  }, []);

  const onTransfer = useCallback(
    async (fromWallet: WalletData, toAddress: string, amount: string) => {
      if (!fromWallet?.wallet) return;
      setIsTransferring(true);
      try {
        const txHash = await transferUSDC({
          fromWallet: { address: fromWallet.address, wallet: fromWallet.wallet },
          toAddress,
          amount,
          activeWallet: activeWallet || undefined,
          setActiveWallet,
          chainIdHex: CHAIN_IDS_HEX.ETHEREUM_SEPOLIA,
          waitForReceipt: true,
        });
        console.log(`Transfer Successful. Tx: ${txHash}`);
        setTransferAmount("");
        await updateBalances();
      } catch (error: any) {
        Alert.alert("Transfer Failed", error?.message || "Could not complete the transfer.");
      } finally {
        setIsTransferring(false);
      }
    },
    [activeWallet, setActiveWallet, setIsTransferring, setTransferAmount, updateBalances]
  );

  const onSwitch = useCallback(async () => {
    const target = isA ? walletB : walletA;
    if (!target) return;
    try {
      setIsSwitching(true);
      await setActiveWallet({ address: target.address, chainId: CHAIN_IDS.ETHEREUM_SEPOLIA });
    } catch (e: any) {
      Alert.alert("Switch Failed", e?.message || "Could not switch wallet");
    } finally {
      setIsSwitching(false);
    }
  }, [isA, walletA, walletB, setActiveWallet]);

  const canSend = !!(sender && receiver && transferAmount && activeWallet && !isTransferring);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={[styles.avatar, { backgroundColor: avatarColor(sender?.address) }]}>
            <Text style={styles.avatarText}>{senderLabel.slice(-1)}</Text>
          </View>
          <Pressable hitSlop={8} onPress={logout}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{senderLabel} · Sender</Text>
          <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
            {senderBalance === null ? "$—" : `$${senderBalance}`}
          </Text>
          <Pressable hitSlop={8} onPress={() => copyToClipboard(sender?.address)}>
            <Text style={styles.heroMeta}>
              {truncate(sender?.address)} · {gas} ETH gas
              {copiedAddress === sender?.address ? "  ✓ copied" : ""}
            </Text>
          </Pressable>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.cardCaption}>You send</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={transferAmount}
              onChangeText={setTransferAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.amountUnit}>USDC</Text>
          </View>
        </View>

        <View style={styles.recipientCard}>
          <View style={[styles.avatarSm, { backgroundColor: avatarColor(receiver?.address) }]}>
            <Text style={styles.avatarSmText}>{receiverLabel.slice(-1)}</Text>
          </View>
          <Pressable style={styles.recipientText} onPress={() => copyToClipboard(receiver?.address)}>
            <Text style={styles.cardCaption}>To</Text>
            <Text style={styles.recipientName}>{receiverLabel}</Text>
            <Text style={styles.recipientAddress}>
              {copiedAddress === receiver?.address ? "Copied ✓" : truncate(receiver?.address)}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.switchChip, isSwitching && styles.chipDisabled, pressed && !isSwitching && styles.pressed]}
            disabled={isSwitching}
            onPress={onSwitch}
          >
            <Text style={styles.switchChipText}>{isSwitching ? "…" : "Switch"}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, !canSend && styles.buttonDisabled, pressed && canSend && styles.primaryButtonPressed]}
          disabled={!canSend}
          onPress={() => {
            if (sender && receiver) onTransfer(sender, receiver.address, transferAmount);
          }}
        >
          <Text style={styles.primaryButtonText}>
            {isTransferring ? "Sending…" : `Send $${transferAmount || "0"} USDC`}
          </Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={updateBalances}>
          <Text style={styles.secondaryButtonText}>Refresh balances</Text>
        </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  logout: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textMuted,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 24,
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
  },
  balance: {
    fontSize: 60,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
  },
  heroMeta: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 10,
    fontVariant: ["tabular-nums"],
  },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: 16,
  },
  cardCaption: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  amountSign: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    paddingVertical: 0,
    marginLeft: 2,
    fontVariant: ["tabular-nums"],
  },
  amountUnit: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textMuted,
  },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.bg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 16,
    ...cardShadow,
  },
  avatarSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  recipientText: {
    flex: 1,
    gap: 2,
  },
  recipientName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  recipientAddress: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  switchChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  switchChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
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
  secondaryButton: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});
