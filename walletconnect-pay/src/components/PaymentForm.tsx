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
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          className="min-h-[52px] w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-base text-white placeholder:text-neutral-500 focus:border-neutral-400 focus:ring-0"
        />
        <button
          type="submit"
          disabled={isLoading || !link.trim()}
          className="flex min-h-[52px] w-full items-center justify-center rounded-lg bg-white px-6 py-3.5 font-semibold text-black shadow-lg transition-colors duration-200 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="flex min-h-[52px] w-full select-none items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-800/60 px-4 py-3 text-left transition-colors hover:border-neutral-400 active:border-neutral-400 active:bg-neutral-800 disabled:opacity-50"
          >
            <span className="text-2xl">{merchant.emoji}</span>
            <span className="text-sm text-white">{merchant.label}</span>
            <span className="ml-auto text-xs text-neutral-500">Preview →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
