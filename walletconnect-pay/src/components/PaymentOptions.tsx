import type { PaymentInfo, PaymentOption } from '@walletconnect/pay'
import { formatAmount } from '../utils/format'

interface PaymentOptionsProps {
  info: PaymentInfo | undefined
  options: PaymentOption[]
  onSelect: (option: PaymentOption) => void
}

export function PaymentOptions({ info, options, onSelect }: PaymentOptionsProps) {
  return (
    <div className="w-full space-y-4">
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
            className="w-full flex items-center justify-between rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 text-left hover:border-neutral-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              {option.amount.display.iconUrl && (
                <img src={option.amount.display.iconUrl} alt="" className="w-7 h-7 rounded-full" />
              )}
              <div>
                <p className="text-white font-medium">{formatAmount(option.amount)}</p>
                <p className="text-neutral-500 text-xs">
                  {option.amount.display.networkName ?? 'EVM'} · ~{option.etaS}s
                </p>
              </div>
            </div>
            <span className="text-neutral-400 text-sm">Select →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
