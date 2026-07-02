import type { PaymentInfo, PaymentOption } from '@walletconnect/pay'
import { ChevronLeft } from 'lucide-react'
import { formatAmount } from '../utils/format'

interface PaymentOptionsProps {
  info: PaymentInfo | undefined
  options: PaymentOption[]
  onSelect: (option: PaymentOption) => void
  onBack: () => void
  isSample: boolean
}

export function PaymentOptions({ info, options, onSelect, onBack, isSample }: PaymentOptionsProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="-ml-1.5 flex items-center rounded-md px-1.5 py-1.5 text-sm text-neutral-400 transition-colors hover:text-white active:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        {isSample && (
          <span className="rounded-full bg-yellow-500/15 text-yellow-300 text-xs px-2.5 py-1 border border-yellow-500/30">
            Sample preview
          </span>
        )}
      </div>

      {info && (
        <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-4 text-left">
          <p className="text-neutral-400 text-xs uppercase tracking-wide">Paying</p>
          <p className="text-white text-lg font-semibold">{info.merchant.name}</p>
          <p className="text-white text-2xl font-bold mt-1">{formatAmount(info.amount)}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-left text-sm text-neutral-400">Pay with</p>
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option)}
            disabled={isSample}
            className="flex min-h-[60px] w-full select-none items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-left transition-colors hover:border-neutral-400 active:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-neutral-700"
          >
            <div className="flex items-center gap-3">
              {option.amount.display.iconUrl && (
                <img src={option.amount.display.iconUrl} alt="" className="h-8 w-8 rounded-full" />
              )}
              <div>
                <p className="font-medium text-white">{formatAmount(option.amount)}</p>
                <p className="text-xs text-neutral-500">
                  {option.amount.display.networkName ?? 'EVM'} · ~{option.etaS}s
                </p>
              </div>
            </div>
            <span className="text-sm text-neutral-400">{isSample ? 'Preview only' : 'Select →'}</span>
          </button>
        ))}
      </div>

      {isSample && (
        <p className="text-xs text-neutral-500 text-left">
          This is a preview with sample data. Paste a real WalletConnect Pay link to sign and pay with your wallet.
        </p>
      )}
    </div>
  )
}
