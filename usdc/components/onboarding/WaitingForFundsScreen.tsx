import React from "react";
import { ActivityIndicator, ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { UserWallet, WalletData } from "@/types/wallet";
import { formatUSDC } from "../../utils/format";
import { ERC20_BALANCE_TIMEOUT_MS } from "../../constants/erc20";
import { useUsdcBalance } from "../../utils/erc20";

interface Props {
  walletB: WalletData | null;
  onNext: () => void;
  onBack: () => void;
  onUpdateBalance: (balance: string) => void;
  activeWallet: UserWallet | null;
}

export const WaitingForFundsScreen = ({ walletB, onNext, onBack, onUpdateBalance, activeWallet }: Props) => {
  const { balance: currentBalance, hasBalance } = useUsdcBalance({
    activeWalletOrProvider: activeWallet,
    ownerAddress: walletB?.address,
    onBalanceUpdate: onUpdateBalance,
    options: { pollIntervalMs: 5000, stopWhenPositive: true, timeoutMs: ERC20_BALANCE_TIMEOUT_MS }
  });
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {
            hasBalance
              ? "Success!"
              : "Waiting for Funds"
          }
        </Text>
        <Text style={styles.subtitle}>
          {hasBalance 
            ? "Funds received successfully" 
            : "Please wait for USDC tokens to arrive"}
        </Text>
      </View>
      
      {/* Main Balance Display - Centerpiece */}
      <View style={styles.balanceContainer}>
        <View style={styles.balanceCard}>
          {/* Balance Amount */}
          <View style={styles.balanceDisplay}>
            <Text style={[
              styles.balanceAmount,
              hasBalance && styles.balanceAmountSuccess
            ]}>
              {formatUSDC(currentBalance)}
            </Text>
            <Text style={[
              styles.balanceCurrency,
              hasBalance && styles.balanceCurrencySuccess
            ]}>
              USDC
            </Text>
          </View>
          
          {/* Status Indicator */}
          <View style={styles.statusIndicator}>
            {!hasBalance ? (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#0066CC" />
                <Text style={styles.loadingText}>Checking balance...</Text>
              </View>
            ) : (
              <View style={styles.successIndicator}>
                <View style={styles.successBadge}>
                  <Text style={styles.successIcon}>✓</Text>
                </View>
                <Text style={styles.successText}>Funds received!</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Wallet Address */}
        <View style={styles.walletInfo}>
          <Text style={styles.walletLabel}>Wallet Address</Text>
          <Pressable
            style={styles.addressContainer}
            onPress={() => {
              const address = walletB?.address || '';
              Clipboard.setStringAsync(address);
            }}
          >
            <Text style={styles.addressText}>
              {truncateAddress(walletB?.address || '')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {hasBalance ? (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed
            ]}
            onPress={onNext}
          >
            <Text style={styles.primaryButtonText}>Continue to App</Text>
          </Pressable>
        ) : (
          <View style={styles.waitingInfo}>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                The Circle faucet usually delivers funds within 30-60 seconds
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.secondaryActions}>
          <Text style={styles.troubleText}>Having trouble?</Text>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed
            ]}
            onPress={onBack}
          >
            <Text style={styles.secondaryButtonText}>Go Back to Faucet</Text>
          </Pressable>
        </View>
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
    paddingVertical: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8898aa',
    textAlign: 'center',
    fontWeight: '400',
  },

  // Balance Container - The Centerpiece
  balanceContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e6ebf1',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  balanceDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '600',
    color: '#8898aa',
  },
  balanceAmountSuccess: {
    color: '#1a1f36',
  },
  balanceCurrency: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8898aa',
    marginTop: 4,
  },
  balanceCurrencySuccess: {
    color: '#424770',
  },

  // Status Indicators
  statusIndicator: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#8898aa',
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00d924',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  successText: {
    fontSize: 14,
    color: '#1a1f36',
    fontWeight: '500',
  },

  // Wallet Info
  walletInfo: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  walletLabel: {
    fontSize: 12,
    color: '#8898aa',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  addressContainer: {
    backgroundColor: '#f6f9fc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e6ebf1',
  },
  addressText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#6772e5',
  },

  // Actions Container
  actionsContainer: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  primaryButton: {
    backgroundColor: '#6772e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },

  // Waiting Info
  waitingInfo: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e6ebf1',
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#525f7f',
    lineHeight: 20,
    flex: 1,
  },

  // Secondary Actions
  secondaryActions: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e6ebf1',
  },
  troubleText: {
    fontSize: 14,
    color: '#8898aa',
    marginBottom: 8,
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#6772e5',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
