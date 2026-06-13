import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { SigningStep } from '../hooks/usePayment'

interface PaymentResultProps {
  phase: 'signing' | 'confirming' | 'success' | 'failed'
  step: SigningStep | undefined
  txId: string | undefined
  error: string | undefined
  onReset: () => void
}

export function PaymentResult({ phase, step, txId, error, onReset }: PaymentResultProps) {
  if (phase === 'signing' || phase === 'confirming') {
    const label =
      phase === 'signing'
        ? step
          ? `Signing action ${step.index} of ${step.total}…`
          : 'Preparing actions…'
        : 'Confirming payment on-chain…'
    return (
      <div className="w-full flex flex-col items-center gap-3 py-6">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
        <p className="text-neutral-300">{label}</p>
      </div>
    )
  }

  if (phase === 'success') {
    return (
      <div className="w-full flex flex-col items-center gap-3 py-6">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
        <p className="text-white font-semibold">Payment complete</p>
        {txId && <p className="text-neutral-500 text-xs break-all">{txId}</p>}
        <button
          onClick={onReset}
          className="mt-2 rounded-md px-3 py-2 text-sm text-neutral-300 underline transition-colors hover:text-white active:text-white"
        >
          Make another payment
        </button>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center gap-3 py-6">
      <XCircle className="w-10 h-10 text-red-400" />
      <p className="text-white font-semibold">Payment failed</p>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      <button
        onClick={onReset}
        className="mt-2 rounded-md px-3 py-2 text-sm text-neutral-300 underline transition-colors hover:text-white active:text-white"
      >
        Try again
      </button>
    </div>
  )
}
