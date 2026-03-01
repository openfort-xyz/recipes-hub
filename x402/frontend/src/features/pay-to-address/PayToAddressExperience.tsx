import { useCallback, useState } from 'react'
import { getApiBaseUrl } from '../backend-wallet/getApiBaseUrl'

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org'

interface CreatedWallet {
  id: string
  address: string
}

function getExplorerAddressUrl(address: string, network?: string): string {
  const base = network === 'base' ? 'https://basescan.org' : BASE_SEPOLIA_EXPLORER
  return `${base}/address/${address}`
}

export function PayToAddressExperience() {
  const baseUrl = getApiBaseUrl()
  const [createdAddress, setCreatedAddress] = useState<CreatedWallet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createAddress = useCallback(async () => {
    setLoading(true)
    setError(null)
    setCreatedAddress(null)
    try {
      const res = await fetch(`${baseUrl}/api/backend-wallet/create`, {
        method: 'POST',
      })
      const data = (await res.json()) as
        | CreatedWallet
        | { error: string; details?: string }
      if (!res.ok) {
        const err = data as { error: string; details?: string }
        setError(err.details ?? err.error ?? 'Failed to create address')
        return
      }
      setCreatedAddress(data as CreatedWallet)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create address')
    } finally {
      setLoading(false)
    }
  }, [baseUrl])

  const copyAddress = useCallback(() => {
    if (!createdAddress) return
    void navigator.clipboard.writeText(createdAddress.address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [createdAddress])

  return (
    <div className="min-h-screen bg-zinc-900 px-4 py-8 text-white">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Pay-to address</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create a <strong>separate</strong> recipient address (not your backend or embedded wallet). Copy it to{' '}
            <code className="rounded bg-zinc-700 px-1">PAY_TO_ADDRESS</code> in backend{' '}
            <code className="rounded bg-zinc-700 px-1">.env.local</code> and restart. Both Embedded and Backend wallet tabs send USDC to this address.
          </p>
        </div>

        <section className="rounded-lg border border-zinc-700 bg-zinc-800 p-6 shadow-xl">
          {loading ? (
            <p className="text-sm text-zinc-400">Creating…</p>
          ) : createdAddress ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded border border-zinc-600 bg-zinc-900 p-3">
                <code className="flex-1 truncate text-sm">{createdAddress.address}</code>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <a
                href={getExplorerAddressUrl(createdAddress.address, 'base-sepolia')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 underline"
              >
                View on Explorer
              </a>
              <p className="text-xs text-zinc-500">
                Paste this address as <code className="rounded bg-zinc-700 px-1">PAY_TO_ADDRESS</code> in backend{' '}
                <code className="rounded bg-zinc-700 px-1">.env.local</code> and restart the server.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void createAddress()}
                disabled={loading}
                className="w-full rounded bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                Create pay-to address
              </button>
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
