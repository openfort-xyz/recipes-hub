import { Loader2 } from 'lucide-react'
import { useState } from 'react'

interface PaymentFormProps {
  onSubmit: (paymentLink: string) => void
  isLoading: boolean
}

export function PaymentForm({ onSubmit, isLoading }: PaymentFormProps) {
  const [link, setLink] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (link.trim()) onSubmit(link)
  }

  return (
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
  )
}
