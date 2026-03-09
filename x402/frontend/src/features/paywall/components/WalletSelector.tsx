import { RecoveryMethod } from '@openfort/react'
import type { ConnectedEmbeddedEthereumWallet } from '@openfort/react/ethereum'

import { Spinner } from './Spinner'

interface WalletSelectorProps {
  wallets: ConnectedEmbeddedEthereumWallet[]
  isConnecting: boolean
  onSelect: (wallet: ConnectedEmbeddedEthereumWallet) => void
}

function RecoveryIcon({ method }: { method?: RecoveryMethod }) {
  if (method === RecoveryMethod.PASSKEY) {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <title>Passkey</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 11c0-1.657-1.343-3-3-3S6 9.343 6 11s1.343 3 3 3c.356 0 .697-.062 1.013-.175L12 16h2v2h2v-2h1v-2h-3.825A2.994 2.994 0 0012 11zM9 11a1 1 0 110-2 1 1 0 010 2z"
        />
      </svg>
    )
  }
  if (method === RecoveryMethod.AUTOMATIC) {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <title>Automatic</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    )
  }
  if (method === RecoveryMethod.PASSWORD) {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <title>Password</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    )
  }
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <title>Wallet</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  )
}

function recoveryLabel(method?: RecoveryMethod): string {
  switch (method) {
    case RecoveryMethod.PASSKEY:
      return 'Passkey'
    case RecoveryMethod.AUTOMATIC:
      return 'Automatic'
    case RecoveryMethod.PASSWORD:
      return 'Password'
    default:
      return 'Embedded'
  }
}

export function WalletSelector({
  wallets,
  isConnecting,
  onSelect,
}: WalletSelectorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4 text-white">
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-zinc-700 bg-zinc-800 p-6 shadow-xl">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">Connect your wallet</h1>
          <p className="text-xs text-zinc-400">
            Select a wallet to continue with your payment.
          </p>
        </div>

        {isConnecting ? (
          <div className="flex items-center justify-center py-4">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.id + wallet.address}
                className="group w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-500 hover:bg-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onSelect(wallet)}
                disabled={wallet.isActive || isConnecting}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 group-hover:text-white transition-colors">
                    <RecoveryIcon method={wallet.recoveryMethod} />
                  </span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">
                      {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {recoveryLabel(wallet.recoveryMethod)} recovery
                    </div>
                  </div>
                  {wallet.isActive && (
                    <span className="text-xs text-green-400 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
