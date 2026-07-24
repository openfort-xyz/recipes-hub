import { useCallback, useState } from "react";
import { ScrollView, Text, View, StyleSheet, Linking, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { WalletData } from "@/types/wallet";
import { colors, radii, cardShadow } from "../../constants/theme";

interface Props {
  walletB: WalletData | null;
  onNext: () => void;
}

const STEPS = [
  "Copy the wallet address above",
  "Open the Circle faucet",
  'Select the "Ethereum Sepolia" network',
  "Paste the address and request $10 USDC",
];

export const FaucetScreen = ({ walletB, onNext }: Props) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback((address: string) => {
    Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const openFaucet = useCallback(() => {
    Linking.openURL("https://faucet.circle.com/");
    // After opening the faucet, transition to the waiting screen.
    setTimeout(() => onNext(), 2000);
  }, [onNext]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>Step 2 of 3</Text>
        </View>
        <Text style={styles.title}>Add test USDC</Text>
        <Text style={styles.subtitle}>Fund Wallet B with $10 from Circle's Ethereum Sepolia faucet.</Text>

        <Pressable
          style={({ pressed }) => [styles.addressCard, pressed && styles.buttonPressed]}
          onPress={() => walletB && copyToClipboard(walletB.address)}
        >
          <View style={styles.addressText}>
            <Text style={styles.addressLabel}>Wallet B address</Text>
            <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
              {walletB?.address}
            </Text>
          </View>
          <View style={[styles.copyChip, copied && styles.copyChipDone]}>
            <Text style={[styles.copyChipText, copied && styles.copyChipTextDone]}>
              {copied ? "Copied" : "Copy"}
            </Text>
          </View>
        </Pressable>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          After opening the faucet you'll land on a screen that detects your funds automatically.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={openFaucet}
        >
          <Text style={styles.primaryButtonText}>Open Circle faucet</Text>
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
    padding: 24,
    paddingBottom: 8,
  },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: 16,
  },
  stepPillText: {
    color: colors.greenPressed,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: "500",
    lineHeight: 22,
    marginBottom: 28,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 18,
    marginBottom: 24,
    ...cardShadow,
  },
  addressText: {
    flex: 1,
    gap: 4,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  address: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  copyChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  copyChipDone: {
    backgroundColor: colors.greenSoft,
  },
  copyChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  copyChipTextDone: {
    color: colors.greenPressed,
  },
  steps: {
    gap: 18,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    lineHeight: 22,
  },
  note: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    fontWeight: "500",
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
  buttonPressed: {
    opacity: 0.85,
  },
});
