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

const CopyIcon = ({ size = 16, color = "#6772e5" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size * 0.9, color, fontWeight: '400', lineHeight: size }}>⧉</Text>
  </View>
);

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
  ethBalances: {[key: string]: string};
  activeWallet: ConnectedEmbeddedEthereumWallet | null;
  setActiveWallet: (options?: any) => Promise<any>;
}

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

  const copyToClipboard = useCallback(async (address: string) => {
    await Clipboard.setStringAsync(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>USDC Transfer</Text>

      <View style={[styles.section, styles.activeSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Sender Wallet</Text>
          <Text style={styles.badge}>ACTIVE</Text>
        </View>
        <View style={styles.addressContainer}>
          <Text style={[styles.address, styles.addressActive]} numberOfLines={1} ellipsizeMode="middle">
            {activeWallet?.address === walletA?.address ? walletA?.address : walletB?.address}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.copyButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => {
              const address = activeWallet?.address === walletA?.address ? walletA?.address : walletB?.address;
              if (address) copyToClipboard(address);
            }}
          >
            <View style={styles.iconContainer}>
              {copiedAddress === (activeWallet?.address === walletA?.address ? walletA?.address : walletB?.address) ? (
                <Text style={styles.copiedText}>✓</Text>
              ) : (
                <CopyIcon size={16} />
              )}
            </View>
          </Pressable>
        </View>
        <Text style={styles.balance}>
          {(() => {
            const val = activeWallet?.address === walletA?.address ? walletA?.balance : walletB?.balance;
            if (isInitialLoad && !val) return 'Loading...';
            return `USDC: ${formatUSDC(val || '0')} USDC`;
          })()}
        </Text>
        <Text style={styles.gasBalance}>
          ETH: {ethBalances[activeWallet?.address || ""] || "0"} (gas)
        </Text>
      </View>

      <View style={[styles.section, styles.otherSection]}>
        <Text style={styles.label}>Receiver Wallet</Text>
        <View style={styles.addressContainer}>
          <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
            {activeWallet?.address === walletA?.address ? walletB?.address : walletA?.address}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.copyButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => {
              const address = activeWallet?.address === walletA?.address ? walletB?.address : walletA?.address;
              if (address) copyToClipboard(address);
            }}
          >
            <View style={styles.iconContainer}>
              {copiedAddress === (activeWallet?.address === walletA?.address ? walletB?.address : walletA?.address) ? (
                <Text style={styles.copiedText}>✓</Text>
              ) : (
                <CopyIcon size={16} />
              )}
            </View>
          </Pressable>
        </View>
        <Text style={styles.balance}>
          {(() => {
            const val = activeWallet?.address === walletA?.address ? walletB?.balance : walletA?.balance;
            if (isInitialLoad && !val) return 'Loading...';
            return `USDC: ${formatUSDC(val || '0')} USDC`;
          })()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Amount (USDC)</Text>
        <TextInput
          style={styles.input}
          value={transferAmount}
          onChangeText={setTransferAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
        />
      </View>

      <View style={styles.buttonRow}>
        <View style={styles.buttonFlex}>
          <Pressable
            style={({ pressed }) => [
              styles.customButton,
              styles.secondaryButton,
              isSwitching && styles.buttonDisabled,
              pressed && !isSwitching && styles.buttonPressed
            ]}
            disabled={isSwitching}
            onPress={async () => {
              const target = activeWallet?.address === walletA?.address ? walletB : walletA;
              if (!target) return;
              try {
                setIsSwitching(true);
                await setActiveWallet({ address: target.address, chainId: CHAIN_IDS.ETHEREUM_SEPOLIA });
              } catch (e: any) {
                Alert.alert("Switch Failed", e?.message || "Could not switch wallet");
              } finally {
                setIsSwitching(false);
              }
            }}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              {isSwitching ? "Switching..." : "Switch Wallet"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.buttonFlex}>
          <Pressable
            style={({ pressed }) => [
              styles.customButton,
              styles.primaryButton,
              (isTransferring || !walletA || !walletB || !transferAmount || !activeWallet) && styles.buttonDisabled,
              pressed && !(isTransferring || !walletA || !walletB || !transferAmount || !activeWallet) && styles.buttonPressed
            ]}
            disabled={isTransferring || !walletA || !walletB || !transferAmount || !activeWallet}
            onPress={() => {
              const from = activeWallet?.address === walletA?.address ? walletA : walletB;
              const to = activeWallet?.address === walletA?.address ? walletB : walletA;
              if (from && to) onTransfer(from, to.address, transferAmount);
            }}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isTransferring ? "Transferring..." : "Transfer USDC"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.buttonWrap}>
        <Pressable
          style={({ pressed }) => [
            styles.customButton,
            styles.secondaryButton,
            pressed && styles.buttonPressed
          ]}
          onPress={updateBalances}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Refresh Balances</Text>
        </Pressable>
      </View>

      <View style={styles.buttonWrap}>
        <Pressable
          style={({ pressed }) => [
            styles.customButton,
            styles.secondaryButton,
            pressed && styles.buttonPressed
          ]}
          onPress={logout}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Logout</Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424770',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
    color: '#1a1f36',
    letterSpacing: -0.5,
  },
  address: {
    fontFamily: 'monospace',
    fontSize: 13,
    backgroundColor: '#f6f9fc',
    color: '#6772e5',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e6ebf1',
    flex: 1,
    marginRight: 8,
  },
  balance: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1f36',
  },
  gasBalance: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8898aa',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e6ebf1',
    borderRadius: 6,
    padding: 14,
    fontSize: 16,
    marginTop: 4,
    backgroundColor: '#fff',
    color: '#1a1f36',
  },
  buttonWrap: {
    width: '100%',
    maxWidth: 400,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#00d924',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeSection: {
    backgroundColor: '#fff',
    borderColor: '#e6ebf1',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  otherSection: {
    backgroundColor: '#fff',
    borderColor: '#e6ebf1',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  addressActive: {
    backgroundColor: '#f8fbff',
    borderColor: '#d6e3f0',
    borderWidth: 1,
  },
  buttonRow: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  buttonFlex: {
    flex: 1,
  },
  customButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#6772e5',
    borderColor: '#6772e5',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderColor: '#e6ebf1',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#424770',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  copyButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f6f9fc',
    borderWidth: 1,
    borderColor: '#e6ebf1',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  copiedText: {
    color: '#00d924',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  iconContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
