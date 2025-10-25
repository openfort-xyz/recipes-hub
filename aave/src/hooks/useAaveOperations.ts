import { useState } from 'react';
import { useSupply, useWithdraw, evmAddress, bigDecimal } from "@aave/react";
import { useSendTransaction } from "@aave/react/viem";
import { useWalletClient, usePublicClient } from "wagmi";

export function useAaveOperations(usdcReserve: any, usdcSupplyData: any, refetchUsdcBalance: any, refreshUserSupplies: any) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [supply, supplying] = useSupply();
  const [withdraw, withdrawing] = useWithdraw();
  const [sendTransaction, sending] = useSendTransaction(walletClient);
  const [isSupplying, setIsSupplying] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleDepositToAave = async () => {
    if (!walletClient || !walletClient.account?.address || !usdcReserve) {
      console.error("Missing requirements:", { walletClient: !!walletClient, address: !!walletClient?.account?.address, usdcReserve: !!usdcReserve });
      return;
    }
    setIsSupplying(true);
    try {
      const supplyResult = await supply({
        market: evmAddress(usdcReserve.marketAddress),
        amount: {
          erc20: {
            currency: evmAddress(usdcReserve.currencyAddress),
            value: bigDecimal(0.1), // 0.1 USDC
          },
        },
        sender: evmAddress(walletClient.account.address),
        chainId: usdcReserve.chainId,
      });

      if (supplyResult.isErr()) {
        console.error("Supply preparation failed:", supplyResult.error);
        setIsSupplying(false);
        return;
      }
      const plan = supplyResult.value;
      let transactionResult;
      switch (plan.__typename) {
        case "TransactionRequest":
          transactionResult = await sendTransaction(plan);
          break;
        case "ApprovalRequired":
          const approvalResult = await sendTransaction(plan.approval);
          if (approvalResult.isErr()) {
            console.error("Approval failed:", approvalResult.error);
            setIsSupplying(false);
            return;
          }
          transactionResult = await sendTransaction(plan.originalTransaction);
          break;
        case "InsufficientBalanceError":
          setIsSupplying(false);
          return;
        default:
          console.error("Unknown plan type:", plan);
          setIsSupplying(false);
          return;
      }
      if (transactionResult.isErr()) {
        console.error("Transaction failed:", transactionResult.error);
      } else {
        try {
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: transactionResult.value });
          }
        } catch (receiptError) {
          console.error("Waiting for transaction receipt failed:", receiptError);
        }
        await refetchUsdcBalance();
        await refreshUserSupplies();
      }
    } catch (error) {
      console.error("Aave deposit failed:", error);
    } finally {
      setIsSupplying(false);
    }
  };

  const handleWithdrawFromAave = async () => {
    if (!walletClient || !walletClient.account?.address || !usdcReserve) {
      console.error("Missing requirements:", { walletClient: !!walletClient, address: !!walletClient?.account?.address, usdcReserve: !!usdcReserve });
      return;
    }
    if (!usdcSupplyData.rawBalance || parseFloat(usdcSupplyData.rawBalance) === 0) {
      console.error("No USDC supply to withdraw");
      return;
    }
    setIsWithdrawing(true);
    try {
      const withdrawResult = await withdraw({
        market: evmAddress(usdcReserve.marketAddress),
        amount: {
          erc20: {
            currency: evmAddress(usdcReserve.currencyAddress),
            value: { max: true },  // Withdraw maximum available balance
          },
        },
        sender: evmAddress(walletClient.account.address),
        chainId: usdcReserve.chainId,
      });
      if (withdrawResult.isErr()) {
        console.error("Withdraw preparation failed:", withdrawResult.error);
        setIsWithdrawing(false);
        return;
      }
      const plan = withdrawResult.value;
      let transactionResult;
      switch (plan.__typename) {
        case "TransactionRequest":
          transactionResult = await sendTransaction(plan);
          break;
        case "InsufficientBalanceError":
          console.error(`Insufficient balance: ${plan.required.value} required.`);
          setIsWithdrawing(false);
          return;
        default:
          console.error("Unknown plan type:", plan);
          setIsWithdrawing(false);
          return;
      }
      if (transactionResult.isErr()) {
        console.error("Withdraw transaction failed:", transactionResult.error);
      } else {
        try {
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: transactionResult.value });
          }
        } catch (receiptError) {
          console.error("Waiting for transaction receipt failed:", receiptError);
        }
        await refetchUsdcBalance();
        await refreshUserSupplies();
      }
    } catch (error) {
    } finally {
      setIsWithdrawing(false);
    }
  };

  const isLoading = supplying.loading || sending.loading || isSupplying || withdrawing.loading || isWithdrawing;

  return {
    handleDepositToAave,
    handleWithdrawFromAave,
    isLoading,
    isSupplying,
    isWithdrawing,
    supplying,
    withdrawing
  };
}