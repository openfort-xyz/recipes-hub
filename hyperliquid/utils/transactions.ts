import { Alert } from 'react-native';

import { HYPE_SYMBOL, DEFAULT_SLIPPAGE, HYPERLIQUID_MIN_DEPOSIT_USDC } from '../constants/hyperliquid';
import { transfer, buy, sell, DEFAULT_MIN_HYPE_ORDER_SIZE } from '../services/HyperliquidClient';
import type { EmbeddedWallet, OrderPlacementResult } from '../services/HyperliquidClient';

export interface TransactionHandlers {
  handleBuy: (
    activeWallet: EmbeddedWallet,
    buyAmount: string,
    hypeBalances: any,
    setIsBuying: (loading: boolean) => void
  ) => Promise<OrderPlacementResult | null>;

  handleSell: (
    activeWallet: EmbeddedWallet,
    sellAmount: string,
    hypeBalances: any,
    setIsSelling: (loading: boolean) => void
  ) => Promise<OrderPlacementResult | null>;

  handleTransfer: (
    transferAmount: string,
    walletBalance: any,
    activeWallet: EmbeddedWallet,
    setIsTransferring: (loading: boolean) => void,
    setTransferAmount: (amount: string) => void,
    refetch: () => void
  ) => Promise<boolean>;
}

export const transactionHandlers: TransactionHandlers = {
  handleBuy: async (
    activeWallet,
    buyAmount,
    hypeBalances,
    setIsBuying
  ) => {
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid USDC amount to buy');
      return null;
    }

    const amount = parseFloat(buyAmount);

    // Calculate available USDC balance (total - hold) for buying
    const usdcPosition = hypeBalances?.account?.assetPositions?.find((pos: any) => pos.coin === "USDC");
    const totalUsdcBalance = parseFloat(usdcPosition?.total || '0');
    const holdUsdcBalance = parseFloat(usdcPosition?.hold || '0');
    const availableUsdcBalance = Math.max(0, totalUsdcBalance - holdUsdcBalance);

    if (amount > availableUsdcBalance) {
      Alert.alert('Insufficient Balance', `Buy amount exceeds available USDC balance. ${holdUsdcBalance > 0 ? `${holdUsdcBalance.toFixed(2)} USDC is locked in open orders.` : ''}`);
      return null;
    }

    if (amount < 1) {
      Alert.alert('Minimum Amount', 'Minimum buy amount is $1 USDC');
      return null;
    }

    setIsBuying(true);
    try {
      const result = await buy(activeWallet, amount, DEFAULT_SLIPPAGE);

      if (result) {
        return result;
      }

      Alert.alert('Buy Order Failed', 'Failed to execute buy order');
      return null;
    } catch (error) {
      console.error('Buy error:', error);
      Alert.alert('Buy Order Failed', `Failed to execute buy order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setIsBuying(false);
    }
  },

  handleSell: async (
    activeWallet,
    sellAmount,
    hypeBalances,
    setIsSelling
  ) => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      Alert.alert('Invalid Amount', `Please enter a valid ${HYPE_SYMBOL} amount to sell`);
      return null;
    }

    const amount = parseFloat(sellAmount);

    // Calculate available balance (total - hold) for selling
    const hypePosition = hypeBalances?.positions?.hypePosition;
    const totalBalance = parseFloat(hypePosition?.total || '0');
    const holdBalance = parseFloat(hypePosition?.hold || '0');
    const availableBalance = Math.max(0, totalBalance - holdBalance);

    if (amount > availableBalance) {
      Alert.alert('Insufficient Balance', `Sell amount exceeds available ${HYPE_SYMBOL} balance. ${holdBalance > 0 ? `${holdBalance.toFixed(4)} ${HYPE_SYMBOL} is locked in open orders.` : ''}`);
      return null;
    }

    if (amount < DEFAULT_MIN_HYPE_ORDER_SIZE) {
      Alert.alert('Minimum Amount', `Minimum sell amount is ${DEFAULT_MIN_HYPE_ORDER_SIZE} ${HYPE_SYMBOL}`);
      return null;
    }

    setIsSelling(true);

    try {
      const result = await sell(activeWallet, amount, DEFAULT_SLIPPAGE);

      if (result) {
        return result;
      }

      Alert.alert('Sell Order Failed', `Failed to sell ${HYPE_SYMBOL}`);
      return null;
    } catch (error) {
      console.error('Sell error:', error);
      Alert.alert('Sell Error', error instanceof Error ? error.message : `Failed to sell ${HYPE_SYMBOL}`);
      return null;
    } finally {
      setIsSelling(false);
    }
  },

  handleTransfer: async (
    transferAmount,
    walletBalance,
    activeWallet,
    setIsTransferring,
    setTransferAmount,
    refetch
  ) => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transfer amount');
      return false;
    }

    const amount = parseFloat(transferAmount);
    const currentWalletBalance = parseFloat(walletBalance?.toString() || '0');

    if (amount > currentWalletBalance) {
      Alert.alert('Insufficient Balance', 'Transfer amount exceeds wallet balance');
      return false;
    }

    if (amount < HYPERLIQUID_MIN_DEPOSIT_USDC) {
      Alert.alert('Invalid Amount', `Transfer amount must be at least ${HYPERLIQUID_MIN_DEPOSIT_USDC} USDC — smaller deposits are not credited by the Hyperliquid bridge.`);
      return false;
    }

    if (!activeWallet) {
      Alert.alert('No Wallet', 'No active wallet found');
      return false;
    }

    setIsTransferring(true);
    try {
      console.log('Transferring', transferAmount, 'USDC to Hyperliquid');
      const success = await transfer(activeWallet, amount);
      if (success) {
        setTransferAmount('');
        refetch();
        return true;
      }
      Alert.alert('Transfer Failed', 'Failed to transfer funds. Please try again.');
      return false;
    } catch (error) {
      console.error('Transfer error:', error);
      Alert.alert('Transfer Failed', error instanceof Error ? error.message : 'Failed to transfer funds. Please try again.');
      return false;
    } finally {
      setIsTransferring(false);
    }
  }
};
