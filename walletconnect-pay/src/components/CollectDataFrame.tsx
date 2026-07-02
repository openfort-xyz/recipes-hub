import { useEffect } from 'react'

interface CollectDataFrameProps {
  url: string
  onComplete: () => void
  onError: (message: string) => void
}

// Some merchants require compliance / KYC data before a payment can proceed. WalletConnect Pay
// hosts that form and reports the outcome via postMessage: `IC_COMPLETE` on success,
// `IC_ERROR` on failure.
export function CollectDataFrame({ url, onComplete, onError }: CollectDataFrameProps) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; message?: string } | undefined
      if (data?.type === 'IC_COMPLETE') onComplete()
      else if (data?.type === 'IC_ERROR') onError(data.message ?? 'Identity verification failed.')
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onComplete, onError])

  return (
    <div className="w-full space-y-3">
      <p className="text-left text-sm text-neutral-400">Complete the merchant's required details to continue.</p>
      <iframe
        title="Merchant data collection"
        src={url}
        className="h-[55dvh] min-h-[20rem] w-full rounded-lg border border-neutral-700 bg-white"
      />
    </div>
  )
}
