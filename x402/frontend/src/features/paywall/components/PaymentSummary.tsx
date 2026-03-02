import { Spinner } from './Spinner'
import { StatusBanner } from './StatusBanner'

export type GasMode = 'openfort-policy' | 'facilitator'

interface PaymentSummaryProps {
  walletAddress: string
  balanceLabel: string
  amountDue: number
  chainName: string
  description?: string
  testnet: boolean
  isCorrectChain: boolean | null
  isWorking: boolean
  isRefreshingBalance: boolean
  onRefreshBalance: () => void
  onSwitchNetwork: () => void
  onSubmitPayment: () => void
  statusMessage?: string
  /** Recipient (PAY_TO_ADDRESS) for one-line display */
  recipientAddress?: string
  recipientBalanceLabel?: string
  isRefreshingRecipientBalance?: boolean
  onRefreshRecipientBalance?: () => void
  /** Gas mode: Openfort policy (sponsor) or Coinbase facilitator (gasless) */
  gasMode?: GasMode
  onGasModeChange?: (mode: GasMode) => void
  /** When false, facilitator option is disabled/hidden */
  facilitatorAvailable?: boolean
}

export function PaymentSummary({
  walletAddress,
  balanceLabel,
  amountDue,
  chainName,
  description,
  testnet,
  isCorrectChain,
  isWorking,
  isRefreshingBalance,
  onRefreshBalance,
  onSwitchNetwork,
  onSubmitPayment,
  statusMessage,
  recipientAddress,
  recipientBalanceLabel,
  isRefreshingRecipientBalance,
  onRefreshRecipientBalance,
  gasMode = 'openfort-policy',
  onGasModeChange,
  facilitatorAvailable = false,
}: PaymentSummaryProps) {
  const showGasModeSwitch = Boolean(onGasModeChange)
  const canSelectFacilitator = facilitatorAvailable

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4 text-white">
      <div className="flex w-full max-w-3xl flex-col gap-8 rounded-lg border border-zinc-700 bg-zinc-800 p-8 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Payment Required</h1>
          <p className="text-sm text-zinc-300">
            {description ? `${description}. ` : ''}To access this content,
            please pay ${amountDue} {chainName} USDC.
          </p>
          {testnet ? (
            <p className="text-xs text-zinc-400">
              Fund your wallet (Payer):{' '}
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Get USDC (faucet)
              </a>
            </p>
          ) : null}
        </div>

        {showGasModeSwitch ? (
          <div className="space-y-2">
            <span className="text-sm text-zinc-400">Pay gas with</span>
            <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
              <button
                type="button"
                onClick={() => onGasModeChange?.('openfort-policy')}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  gasMode === 'openfort-policy'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Openfort policy (sponsor gas)
              </button>
              <button
                type="button"
                onClick={() =>
                  canSelectFacilitator && onGasModeChange?.('facilitator')
                }
                disabled={!canSelectFacilitator}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  gasMode === 'facilitator'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={
                  canSelectFacilitator
                    ? 'Coinbase facilitator pays gas'
                    : 'Set facilitator URL, API key, and secret in backend'
                }
              >
                Coinbase facilitator (gasless)
              </button>
            </div>
          </div>
        ) : null}

        <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-900 p-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Wallet:</span>
              <span>{walletAddress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Available balance:</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{balanceLabel}</span>
                <button
                  onClick={onRefreshBalance}
                  disabled={isRefreshingBalance}
                  type="button"
                  className="text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                  title="Refresh balance"
                >
                  <svg
                    className={`h-4 w-4 ${isRefreshingBalance ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <title>Refresh balance</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Amount due:</span>
              <span>${amountDue} USDC</span>
            </div>
            {recipientAddress != null ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Recipient:</span>
                <span className="truncate max-w-40" title={recipientAddress}>
                  {recipientAddress.slice(0, 6)}…{recipientAddress.slice(-4)}
                </span>
                <span className="text-white">
                  {recipientBalanceLabel ?? '…'}
                </span>
                {onRefreshRecipientBalance ? (
                  <button
                    onClick={onRefreshRecipientBalance}
                    disabled={isRefreshingRecipientBalance}
                    type="button"
                    className="text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                    title="Refresh recipient balance"
                  >
                    <svg
                      className={`h-4 w-4 ${isRefreshingRecipientBalance ? 'animate-spin' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <title>Refresh recipient balance</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-zinc-400">Network:</span>
              <span>{chainName}</span>
            </div>
          </div>

          {isCorrectChain ? (
            <button
              className="w-full rounded bg-primary py-3 text-center font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onSubmitPayment}
              disabled={isWorking}
              type="button"
            >
              {isWorking ? <Spinner /> : 'Pay now'}
            </button>
          ) : (
            <button
              className="w-full rounded bg-primary py-3 text-center font-medium text-white transition-colors hover:bg-primary-hover"
              onClick={onSwitchNetwork}
              type="button"
            >
              Switch to {chainName}
            </button>
          )}
        </div>
        {statusMessage ? <StatusBanner message={statusMessage} /> : null}
      </div>
    </div>
  )
}
