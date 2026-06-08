import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { SAMPLE_MERCHANTS, type SampleMerchant } from '../lib/samples'

interface PaymentFormProps {
  onSubmit: (paymentLink: string) => void
  onPickSample: (sample: SampleMerchant) => void
  isLoading: boolean
}

export function PaymentForm({ onSubmit, onPickSample, isLoading }: PaymentFormProps) {
  const [link, setLink] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (link.trim()) onSubmit(link)
  }

  return (
    <div className="w-full space-y-5">
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <label htmlFor="payment-link" className="block text-left text-sm text-neutral-400">
          Payment link
        </label>
        <input
          id="payment-link"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="https://pay.walletconnect.com/?pid=…"
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-4 py-3 placeholder:text-neutral-500 focus:border-neutral-400 focus:ring-0"
        />
        <button
          type="submit"
          disabled={isLoading || !link.trim()}
          className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading options…
            </>
          ) : (
            'Continue'
          )}
        </button>
      </form>

      <p className="text-xs text-neutral-500 text-left">
        No link yet? Create a test payment with the{' '}
        <a
          href="https://dashboard.walletconnect.com"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-neutral-300"
        >
          WalletConnect Dashboard POS tool
        </a>
        .
      </p>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-800" />
        <span className="text-xs text-neutral-500 whitespace-nowrap">or preview a sample</span>
        <div className="h-px flex-1 bg-neutral-800" />
      </div>

      <div className="space-y-2">
        {SAMPLE_MERCHANTS.map((merchant) => (
          <button
            key={merchant.id}
            onClick={() => onPickSample(merchant)}
            disabled={isLoading}
            className="w-full flex items-center gap-3 rounded-lg bg-neutral-800/60 border border-neutral-700 px-4 py-3 text-left hover:border-neutral-400 transition-colors disabled:opacity-50"
          >
            <span className="text-xl">{merchant.emoji}</span>
            <span className="text-white text-sm">{merchant.label}</span>
            <span className="ml-auto text-neutral-500 text-xs">Preview →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
