import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseAbi, type Address } from 'viem';
import { USDC_CONTRACT_ADDRESS, usdcAbi } from '../contracts/usdc';

const VAULT_ADDRESS = '0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183' as Address;

const VAULT_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function convertToAssets(uint256 shares) external view returns (uint256)',
  'function deposit(uint256 assets, address receiver) external returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) external returns (uint256)',
]);

const SUPPLY_AMOUNT = 100_000n; // 0.1 USDC (6 decimals)

export function useVaultOperations() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isSupplying, setIsSupplying] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const { data: walletBalance, refetch: refetchWalletBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  }) as { data: bigint | undefined; refetch: () => Promise<{ data: bigint | undefined }> };

  const { data: userShares, refetch: refetchShares } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  }) as { data: bigint | undefined; refetch: () => Promise<unknown> };

  const { data: userVaultAssets, refetch: refetchVaultAssets } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'convertToAssets',
    args: userShares ? [userShares] : undefined,
    query: { enabled: !!userShares && userShares > 0n },
  }) as { data: bigint | undefined; refetch: () => Promise<unknown> };

  // 0 shares → 0 assets; otherwise use the converted value
  const userVaultBalance = userShares === 0n ? 0n : userVaultAssets;

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchWalletBalance(), refetchShares(), refetchVaultAssets()]);
  }, [refetchWalletBalance, refetchShares, refetchVaultAssets]);

  const handleSupply = useCallback(async () => {
    if (!address || !walletBalance || walletBalance < SUPPLY_AMOUNT || !publicClient) return;

    setIsSupplying(true);
    try {
      const approveHash = await writeContractAsync({
        address: USDC_CONTRACT_ADDRESS,
        abi: usdcAbi,
        functionName: 'approve',
        args: [VAULT_ADDRESS, SUPPLY_AMOUNT],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const depositHash = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [SUPPLY_AMOUNT, address],
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      await refetchAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Deposit failed: ${message}`);
    } finally {
      setIsSupplying(false);
    }
  }, [address, walletBalance, writeContractAsync, publicClient, refetchAll]);

  const handleWithdraw = useCallback(async () => {
    if (!address || !userShares || userShares === 0n || !publicClient) return;

    setIsWithdrawing(true);
    try {
      const redeemHash = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'redeem',
        args: [userShares, address, address],
        gas: 500_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash: redeemHash });

      await refetchAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const msg = message.toLowerCase();

      if (msg.includes('rate limit') || msg.includes('overrate')) {
        alert('Rate limit exceeded. Please wait a moment and try again.');
      } else if (msg.includes('insufficient funds') || msg.includes('gas')) {
        alert('Insufficient gas or funds for withdrawal transaction.');
      } else if (msg.includes('user rejected')) {
        alert('Transaction was cancelled.');
      } else {
        alert(`Withdraw failed: ${message || 'Unknown error'}`);
      }
    } finally {
      setIsWithdrawing(false);
    }
  }, [address, userShares, writeContractAsync, publicClient, refetchAll]);

  return {
    isSupplying,
    isWithdrawing,
    walletBalance,
    userVaultBalance,
    handleSupply,
    handleWithdraw,
    fetchVaultBalance: refetchVaultAssets,
  };
}
