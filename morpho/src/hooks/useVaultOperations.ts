import { useState, useCallback, useMemo } from 'react';
import { useAccount, useReadContract, useWalletClient } from 'wagmi';
import { createPublicClient, http, parseAbi, type Address, type Hash } from 'viem';
import { base } from 'viem/chains';
import { USDC_CONTRACT_ADDRESS, usdcAbi } from '../contracts/usdc';
import { SELECTED_BASE_MAINNET_RPC_URL } from '../lib/rpc';

const VAULT_ADDRESS = "0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183";
const MINIMAL_VAULT_ABI = parseAbi([
  "function balanceOf(address account) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function deposit(uint256 assets, address receiver) external returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) external returns (uint256)",
]);

const POLL_INTERVAL_MS = 1_000;
const MAX_BALANCE_ATTEMPTS = 10;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useVaultOperations() {
  const [isSupplying, setIsSupplying] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [userVaultBalance, setUserVaultBalance] = useState<bigint | undefined>(undefined);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const viemClient = useMemo(() => (
    createPublicClient({
      chain: base,
      transport: http(SELECTED_BASE_MAINNET_RPC_URL, {
        retryCount: 3,
        retryDelay: 1000,
        batch: { batchSize: 50, wait: 500 },
      }),
      batch: { multicall: { batchSize: 1024, wait: 200 } },
    })
  ), []);

  const { data: walletBalance, refetch: refetchWalletBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  }) as { data: bigint | undefined; refetch: () => Promise<{ data: bigint | undefined }> };

  const waitForTransaction = useCallback(async (hash: Hash) => {
    await viemClient.waitForTransactionReceipt({ hash });
  }, [viemClient]);

  const readVaultBalance = useCallback(async () => {
    if (!address) return undefined;

    const userShares = await viemClient.readContract({
      address: VAULT_ADDRESS as Address,
      abi: MINIMAL_VAULT_ABI,
      functionName: 'balanceOf',
      args: [address as Address],
    });

    if (userShares === 0n) {
      return 0n;
    }

    return viemClient.readContract({
      address: VAULT_ADDRESS as Address,
      abi: MINIMAL_VAULT_ABI,
      functionName: 'convertToAssets',
      args: [userShares],
    });
  }, [address, viemClient]);

  const updateVaultBalance = useCallback(async () => {
    try {
      const vaultBalance = await readVaultBalance();
      setUserVaultBalance(vaultBalance);
      return vaultBalance;
    } catch (error) {
      console.error("Error fetching vault balance:", error);
      return undefined;
    }
  }, [readVaultBalance]);

  const fetchVaultBalance = useCallback(async () => {
    await updateVaultBalance();
  }, [updateVaultBalance]);

  const waitForWalletBalanceChange = useCallback(async (previousBalance: bigint) => {
    if (!address) return previousBalance;

    for (let attempt = 0; attempt < MAX_BALANCE_ATTEMPTS; attempt++) {
      try {
        const result = await refetchWalletBalance();
        const currentBalance = result.data ?? previousBalance;

        if (currentBalance !== previousBalance) {
          return currentBalance;
        }
      } catch (error) {
        console.error("Error refreshing wallet balance:", error);
        break;
      }

      await delay(POLL_INTERVAL_MS);
    }

    return previousBalance;
  }, [address, refetchWalletBalance]);

  const waitForVaultBalanceChange = useCallback(async (previousBalance: bigint | undefined) => {
    for (let attempt = 0; attempt < MAX_BALANCE_ATTEMPTS; attempt++) {
      const currentBalance = await updateVaultBalance();

      if (currentBalance !== undefined && currentBalance !== previousBalance) {
        return currentBalance;
      }

      await delay(POLL_INTERVAL_MS);
    }

    return previousBalance;
  }, [updateVaultBalance]);

  const handleSupply = useCallback(async () => {
    if (!walletClient || !address || !walletBalance || walletBalance === 0n) return;

    setIsSupplying(true);
    try {
      const initialWalletBalance = walletBalance;
      const initialVaultBalance = userVaultBalance;

      // 0.1 USDC with 6 decimals = 100000
      const supplyAmount = 100000n;

      // Check if wallet has enough balance
      if (walletBalance < supplyAmount) {
        alert("Insufficient USDC balance. Need at least 0.1 USDC.");
        setIsSupplying(false);
        return;
      }

      const approveHash = await walletClient.writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: usdcAbi,
        functionName: 'approve',
        args: [VAULT_ADDRESS as `0x${string}`, supplyAmount],
      });

      await waitForTransaction(approveHash);

      const depositHash = await walletClient.writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: MINIMAL_VAULT_ABI,
        functionName: 'deposit',
        args: [supplyAmount, address as `0x${string}`],
      });

      await waitForTransaction(depositHash);

      await Promise.all([
        waitForWalletBalanceChange(initialWalletBalance),
        waitForVaultBalanceChange(initialVaultBalance),
      ]);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Deposit failed: ${message}`);
    } finally {
      setIsSupplying(false);
    }
  }, [
    walletClient,
    address,
    walletBalance,
    userVaultBalance,
    waitForTransaction,
    waitForWalletBalanceChange,
    waitForVaultBalanceChange,
  ]);

  const handleWithdraw = useCallback(async () => {
    if (!walletClient || !address || userVaultBalance === undefined || userVaultBalance === 0n) return;

    setIsWithdrawing(true);
    try {
      const initialWalletBalance = walletBalance ?? 0n;
      const initialVaultBalance = userVaultBalance;

      const userShares = await viemClient.readContract({
        address: VAULT_ADDRESS as Address,
        abi: MINIMAL_VAULT_ABI,
        functionName: 'balanceOf',
        args: [address as Address],
      });

      if (userShares === 0n) {
        alert("No vault balance to withdraw");
        setIsWithdrawing(false);
        return;
      }

      const redeemHash = await walletClient.writeContract({
        address: VAULT_ADDRESS as Address,
        abi: MINIMAL_VAULT_ABI,
        functionName: 'redeem',
        args: [userShares, address as Address, address as Address],
        gas: 500000n,
      });

      await waitForTransaction(redeemHash);

      await Promise.all([
        waitForWalletBalanceChange(initialWalletBalance),
        waitForVaultBalanceChange(initialVaultBalance),
      ]);

    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const normalisedMessage = message.toLowerCase();

      if (normalisedMessage.includes('rate limit') || normalisedMessage.includes('overrate')) {
        alert("Rate limit exceeded. Please wait a moment and try again.");
      } else if (normalisedMessage.includes('insufficient funds') || normalisedMessage.includes('gas')) {
        alert("Insufficient gas or funds for withdrawal transaction.");
      } else if (normalisedMessage.includes('user rejected')) {
        alert("Transaction was cancelled.");
      } else {
        alert(`Withdraw failed: ${message || 'Unknown error'}`);
      }
    } finally {
      setIsWithdrawing(false);
    }
  }, [
    walletClient,
    address,
    userVaultBalance,
    walletBalance,
    viemClient,
    waitForTransaction,
    waitForWalletBalanceChange,
    waitForVaultBalanceChange,
  ]);

  return {
    isSupplying,
    isWithdrawing,
    walletBalance,
    userVaultBalance,
    handleSupply,
    handleWithdraw,
    fetchVaultBalance,
  };
}
