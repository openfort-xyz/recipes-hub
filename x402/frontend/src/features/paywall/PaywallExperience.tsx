import { useUser } from '@openfort/react'
import { type ConnectedEmbeddedEthereumWallet, useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPublicClient, erc20Abi, formatUnits, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import {
  useAccount,
  useSwitchChain,
  useWalletClient,
  useWriteContract,
} from 'wagmi'

import {
  createPayment,
  encodePayment,
  ensureValidAmount,
  getUSDCBalance,
  type SupportedNetwork,
} from '../../integrations/x402'
import { getApiBaseUrl } from '../backend-wallet/getApiBaseUrl'
import { AuthPrompt } from './components/AuthPrompt'
import { ErrorState } from './components/ErrorState'
import { LoadingState } from './components/LoadingState'
import { PaymentSuccess } from './components/PaymentSuccess'
import { type GasMode, PaymentSummary } from './components/PaymentSummary'
import { WalletSelector } from './components/WalletSelector'
import { usePaymentFlow } from './hooks/usePaymentFlow'
import { useUsdcBalance } from './hooks/useUsdcBalance'
import {
  getRequiredAmount,
  hasSufficientBalance,
  isDestinationConfigured,
} from './utils/paymentGuards'

const USDC_DECIMALS = 6

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
  const { wallets, status: walletStatus, setActive } = useEthereumEmbeddedWallet()
  const isLoadingWallets = walletStatus === 'fetching-wallets'
  const isConnecting = walletStatus === 'connecting' || walletStatus === 'reconnecting'

  // Unified payment flow hook
  const {
    state: paymentState,
    paymentRequirements,
    currentUrl,
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

  const [gasMode, setGasMode] = useState<GasMode>('openfort-policy')
  const [facilitatorAvailable, setFacilitatorAvailable] = useState(false)
  const [facilitatorPaying, setFacilitatorPaying] = useState(false)
  const [facilitatorSuccessContent, setFacilitatorSuccessContent] =
    useState<unknown>(null)
  const [facilitatorError, setFacilitatorError] = useState<string | null>(null)
  const walletClient = useWalletClient()

  useEffect(() => {
    const baseUrl = getApiBaseUrl()
    void fetch(`${baseUrl}/api/backend-wallet/status`)
      .then((res) => res.json())
      .then((data: { facilitatorAvailable?: boolean }) => {
        setFacilitatorAvailable(Boolean(data.facilitatorAvailable))
      })
      .catch(() => setFacilitatorAvailable(false))
  }, [])

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
  })

  const [recipientBalance, setRecipientBalance] = useState<bigint>(0n)
  const [recipientBalanceLoading, setRecipientBalanceLoading] = useState(false)
  const fetchRecipientBalance = useCallback(async () => {
    const payTo = paymentRequirements?.payTo
    if (!payTo || !publicClient) {
      setRecipientBalance(0n)
      return
    }
    setRecipientBalanceLoading(true)
    try {
      const balance = await getUSDCBalance(publicClient, payTo)
      setRecipientBalance(balance)
    } catch {
      setRecipientBalance(0n)
    } finally {
      setRecipientBalanceLoading(false)
    }
  }, [paymentRequirements?.payTo, publicClient])
  useEffect(() => {
    if (!paymentRequirements?.payTo) return
    void fetchRecipientBalance()
  }, [paymentRequirements?.payTo, fetchRecipientBalance])

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

  const handlePaymentViaFacilitator = useCallback(async () => {
    const client = walletClient?.data
    if (!paymentRequirements || !address || !currentUrl || !client) {
      setFacilitatorError('Wallet or payment details not ready.')
      return
    }
    const clientForSigning = {
      ...client,
      account: client.account ?? (address ? { address } : undefined),
    }
    if (!clientForSigning.account) {
      setFacilitatorError('Wallet client missing account address.')
      return
    }
    const validRequirements = ensureValidAmount(paymentRequirements)
    const requiredAmount = getRequiredAmount(validRequirements)
    setFacilitatorPaying(true)
    setFacilitatorError(null)
    try {
      const balance = await getUSDCBalance(publicClient, address)
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
      const payment = await createPayment(clientForSigning, validRequirements)
      const encoded = encodePayment(payment)
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'PAYMENT-SIGNATURE': encoded,
          'X-Wallet-Type': 'embedded',
        },
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as {
          message?: string
        }
        throw new Error(err.message ?? `Request failed: ${response.status}`)
      }
      const data = (await response.json()) as {
        success?: boolean
        content?: unknown
        message?: string
      }
      setFacilitatorSuccessContent(data)
    } catch (error) {
      setFacilitatorError(
        error instanceof Error ? error.message : 'Payment failed',
      )
    } finally {
      setFacilitatorPaying(false)
    }
  }, [
    address,
    chainName,
    currentUrl,
    paymentRequirements,
    publicClient,
    walletClient?.data,
  ])

  const handlePayment = useCallback(async () => {
    if (!paymentRequirements || !address) {
      return
    }
    if (gasMode === 'facilitator') {
      await handlePaymentViaFacilitator()
      return
    }

    const validRequirements = ensureValidAmount(paymentRequirements)
    const requiredAmount = getRequiredAmount(validRequirements)

    try {
      const balance = await getUSDCBalance(publicClient, address)
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
    gasMode,
    paymentChain.id,
    paymentRequirements,
    publicClient,
    writeContractAsync,
    initiatePayment,
    handlePaymentViaFacilitator,
  ])

  const connectWallet = useCallback(
    (wallet: ConnectedEmbeddedEthereumWallet) => {
      void setActive({ address: wallet.address })
    },
    [setActive],
  )

  const handleTryAnotherPayment = useCallback(() => {
    setFacilitatorSuccessContent(null)
    setFacilitatorError(null)
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

  // Show success state (on-chain or facilitator path)
  if (paymentState === 'success' && successContent) {
    return (
      <PaymentSuccess
        content={successContent}
        onReset={handleTryAnotherPayment}
      />
    )
  }
  if (facilitatorSuccessContent) {
    return (
      <PaymentSuccess
        content={facilitatorSuccessContent}
        onReset={handleTryAnotherPayment}
      />
    )
  }

  // Show payment summary
  const isWorking =
    paymentState === 'paying' ||
    paymentState === 'confirming' ||
    paymentState === 'unlocking' ||
    isWritePending ||
    facilitatorPaying

  const payTo = paymentRequirements?.payTo
  const recipientBalanceLabel = recipientBalanceLoading
    ? '…'
    : payTo
      ? `$${formatUnits(recipientBalance, USDC_DECIMALS)} USDC`
      : undefined

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
      statusMessage={facilitatorError ?? statusMessage}
      recipientAddress={payTo}
      recipientBalanceLabel={recipientBalanceLabel}
      isRefreshingRecipientBalance={recipientBalanceLoading}
      onRefreshRecipientBalance={
        payTo ? () => void fetchRecipientBalance() : undefined
      }
      gasMode={gasMode}
      onGasModeChange={setGasMode}
      facilitatorAvailable={facilitatorAvailable}
    />
  )
}
