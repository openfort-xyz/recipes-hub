import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WalletData } from "@/types/wallet";
import { colors, radii, cardShadow, avatarColor } from "../../constants/theme";

interface Props {
  walletA: WalletData | null;
  walletB: WalletData | null;
  onWalletACreated: (wallet: WalletData) => void;
  onWalletBCreated: (wallet: WalletData) => void;
  onNext: () => void;
  createWallet: (args: { chainId: number; onError: (e: any) => void; onSuccess: (res: any) => void }) => Promise<any> | void;
  isCreating: boolean;
}

const truncate = (address?: string) =>
  address ? `${address.slice(0, 6)}···${address.slice(-4)}` : "";

interface WalletCreationItemProps {
  label: string;
  wallet: WalletData | null;
  isCreating: boolean;
  disabled: boolean;
  onCreateWallet: () => void;
}

const WalletCreationItem = ({ label, wallet, isCreating, disabled, onCreateWallet }: WalletCreationItemProps) => {
  const initial = label.slice(-1).toUpperCase();
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: wallet ? avatarColor(wallet.address) : colors.surface }]}>
          <Text style={[styles.avatarText, !wallet && styles.avatarTextEmpty]}>{initial}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardAddress} numberOfLines={1}>
            {wallet ? truncate(wallet.address) : "Not created yet"}
          </Text>
        </View>
        {wallet ? (
          <View style={styles.readyChip}>
            <Text style={styles.readyChipText}>Ready</Text>
          </View>
        ) : null}
      </View>

      {!wallet ? (
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            disabled && styles.buttonDisabled,
            pressed && !disabled && styles.buttonPressed,
          ]}
          disabled={disabled}
          onPress={onCreateWallet}
        >
          <Text style={styles.createButtonText}>{isCreating ? "Creating…" : `Create ${label}`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export const CreateWalletsScreen = ({
  walletA,
  walletB,
  onWalletACreated,
  onWalletBCreated,
  onNext,
  createWallet,
  isCreating,
}: Props) => {
  const [isCreatingWalletA, setIsCreatingWalletA] = useState(false);
  const [isCreatingWalletB, setIsCreatingWalletB] = useState(false);

  const handleCreateWallet = useCallback(
    (isFirstWallet: boolean) => {
      if (isFirstWallet) {
        setIsCreatingWalletA(true);
      } else {
        setIsCreatingWalletB(true);
      }

      createWallet({
        chainId: 11155111, // Ethereum Sepolia (Circle faucet uses this chain)
        onError: (error) => {
          console.error("Error creating wallet", error);
          Alert.alert("Error", "Failed to create wallet");
          if (isFirstWallet) {
            setIsCreatingWalletA(false);
          } else {
            setIsCreatingWalletB(false);
          }
        },
        onSuccess: ({ wallet }) => {
          if (!wallet?.address) return;

          const walletData: WalletData = {
            address: wallet.address,
            balance: "0",
            wallet: wallet,
          };

          if (isFirstWallet) {
            onWalletACreated(walletData);
            setIsCreatingWalletA(false);
          } else {
            onWalletBCreated(walletData);
            setIsCreatingWalletB(false);
          }
        },
      });
    },
    [createWallet, onWalletACreated, onWalletBCreated]
  );

  const bothReady = !!walletA && !!walletB;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>Step 1 of 3</Text>
        </View>
        <Text style={styles.title}>Create your wallets</Text>
        <Text style={styles.subtitle}>Spin up two embedded wallets to send USDC between.</Text>

        <View style={styles.cards}>
          <WalletCreationItem
            label="Wallet A"
            wallet={walletA}
            isCreating={isCreatingWalletA}
            disabled={isCreating}
            onCreateWallet={() => handleCreateWallet(true)}
          />
          <WalletCreationItem
            label="Wallet B"
            wallet={walletB}
            isCreating={isCreatingWalletB}
            disabled={isCreating || !walletA}
            onCreateWallet={() => handleCreateWallet(false)}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            !bothReady && styles.buttonDisabled,
            pressed && bothReady && styles.primaryButtonPressed,
          ]}
          disabled={!bothReady}
          onPress={onNext}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
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
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radii.card,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...cardShadow,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  avatarTextEmpty: {
    color: colors.textMuted,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  cardAddress: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  readyChip: {
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  readyChipText: {
    color: colors.greenPressed,
    fontSize: 13,
    fontWeight: "700",
  },
  createButton: {
    marginTop: 16,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
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
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
