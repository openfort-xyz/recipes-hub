import { type UserWallet, useUser, useWallets } from '@openfort/react'
import { useCallback, useMemo } from 'react'
import { createPublicClient, erc20Abi, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi'

import {
  ensureValidAmount,
  getUSDCBalance,
  type SupportedNetwork,
} from '../../integrations/x402'
import { AuthPrompt } from './components/AuthPrompt'
import { ErrorState } from './components/ErrorState'
import { LoadingState } from './components/LoadingState'
import { PaymentSuccess } from './components/PaymentSuccess'
import { PaymentSummary } from './components/PaymentSummary'
import { WalletSelector } from './components/WalletSelector'
import { usePaymentFlow } from './hooks/usePaymentFlow'
import { useUsdcBalance } from './hooks/useUsdcBalance'
import {
  getRequiredAmount,
  hasSufficientBalance,
  isDestinationConfigured,
} from './utils/paymentGuards'

const BALANCE_REFRESH_INTERVAL_MS = 3000

export function PaywallExperience() {
  const initialNetwork: SupportedNetwork =
    window.x402?.testnet === false ? 'base' : 'base-sepolia'

  // Derive payment chain details
  const paymentChain = initialNetwork === 'base' ? base : baseSepolia
  const chainName = initialNetwork === 'base' ? 'Base' : 'Base Sepolia'
  const testnet = initialNetwork !== 'base'

  const { address, isConnected, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { isAuthenticated } = useUser()
  const { wallets, isLoadingWallets, setActiveWallet, isConnecting } =
    useWallets()

  // Unified payment flow hook
  const {
    state: paymentState,
    paymentRequirements,
    amount,
    statusMessage,
    error: flowError,
    successContent,
    initiatePayment,
    refetch: refetchRequirements,
    reset: resetPayment,
  } = usePaymentFlow({
    network: initialNetwork,
    resourceUrl: window.x402?.currentUrl,
    paymentChainId: paymentChain.id,
  })

  // Create public client for balance checks
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: paymentChain,
        transport: http(),
      }),
    [paymentChain],
  )

  const {
    formattedBalance: formattedUsdcBalance,
    isRefreshingBalance,
    refreshBalance,
  } = useUsdcBalance({
    address,
    paymentRequirements,
    publicClient,
    refreshIntervalMs: BALANCE_REFRESH_INTERVAL_MS,
  })

  const { writeContractAsync, isPending: isWritePending } = useWriteContract()

  // Check if we're on the correct chain
  const isCorrectChain = isConnected && chainId === paymentChain.id

  const handleSwitchChain = useCallback(async () => {
    if (isCorrectChain) return

    try {
      await switchChainAsync({ chainId: paymentChain.id })
    } catch (error) {
      console.error('Failed to switch network', error)
    }
  }, [isCorrectChain, switchChainAsync, paymentChain.id])

  const handlePayment = useCallback(async () => {
    if (!paymentRequirements || !address) {
      return
    }

    const validRequirements = ensureValidAmount(paymentRequirements)
    const requiredAmount = getRequiredAmount(validRequirements)

    try {
      const balance = await getUSDCBalance(publicClient as any, address)
      if (!hasSufficientBalance(balance, requiredAmount)) {
        throw new Error(
          `Insufficient balance. Make sure you have USDC on ${chainName}.`,
        )
      }

      if (!isDestinationConfigured(validRequirements.payTo)) {
        throw new Error(
          'Payment destination not configured. Please contact support.',
        )
      }

      const hash = await writeContractAsync({
        address: validRequirements.asset,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [validRequirements.payTo, requiredAmount],
        chainId: paymentChain.id,
      })

      initiatePayment(hash)
    } catch (error) {
      console.error('Payment failed', error)
    }
  }, [
    address,
    chainName,
    paymentChain.id,
    paymentRequirements,
    publicClient,
    writeContractAsync,
    initiatePayment,
  ])

  const connectWallet = useCallback(
    (wallet: UserWallet) => {
      void setActiveWallet(wallet.id)
    },
    [setActiveWallet],
  )

  const handleTryAnotherPayment = useCallback(() => {
    resetPayment()
    void refreshBalance(true)
  }, [resetPayment, refreshBalance])

  // Show loading state
  if (paymentState === 'loading' && !paymentRequirements) {
    return (
      <LoadingState
        title="Payment Required"
        subtitle="Loading payment details..."
      />
    )
  }

  // Show error state
  if (paymentState === 'error' || flowError) {
    return (
      <ErrorState
        title="Payment Configuration Error"
        message={
          statusMessage ||
          'We could not retrieve payment requirements from the server.'
        }
        actionLabel="Retry"
        onAction={() => {
          void refetchRequirements()
        }}
      />
    )
  }

  if (!paymentRequirements) {
    return (
      <ErrorState
        title="Payment Configuration Missing"
        message="No payment requirements were provided. Please check your server configuration."
      />
    )
  }

  if (!isAuthenticated) {
    return <AuthPrompt />
  }

  if (isLoadingWallets || wallets.length === 0) {
    return (
      <LoadingState
        title="Setting up your wallet"
        subtitle="We're preparing your embedded Openfort wallet."
      />
    )
  }

  if (!isConnected || !address) {
    return (
      <WalletSelector
        wallets={wallets}
        isConnecting={isConnecting}
        onSelect={connectWallet}
      />
    )
  }

  // Show success state
  if (paymentState === 'success' && successContent) {
    return (
      <PaymentSuccess
        content={successContent}
        onReset={handleTryAnotherPayment}
      />
    )
  }

  // Show payment summary
  const isWorking =
    paymentState === 'paying' ||
    paymentState === 'confirming' ||
    paymentState === 'unlocking' ||
    isWritePending

  return (
    <PaymentSummary
      walletAddress={address}
      balanceLabel={
        formattedUsdcBalance ? `$${formattedUsdcBalance} USDC` : 'Loading...'
      }
      amountDue={amount}
      chainName={chainName}
      description={paymentRequirements.description}
      testnet={testnet}
      isCorrectChain={isCorrectChain}
      isWorking={isWorking}
      isRefreshingBalance={isRefreshingBalance}
      onRefreshBalance={() => {
        void refreshBalance(true)
      }}
      onSwitchNetwork={handleSwitchChain}
      onSubmitPayment={handlePayment}
      statusMessage={statusMessage}
    />
  )
}
