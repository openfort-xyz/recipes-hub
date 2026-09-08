import { useSignOut } from '@openfort/react'
import { useState } from 'react'
import type { DemoConfig } from '../config/demos'
import { WalletModal } from './WalletModal'

function LogoutIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Deliberately does not use Openfort's built-in "Connected" panel - that panel
 * hardcodes a Send/Deposit action row with no config flag to hide Deposit, and
 * this recipe doesn't want a funding entry point in the app at all (Openfort's
 * funding rail has no Monad support - see README "Known limitations"). This
 * renders only what the recipe actually needs: the address (opens a
 * Send/Receive modal) and sign-out.
 */
export function WalletChip({
  address,
  demo,
  onSettled,
}: {
  address: string
  demo: DemoConfig
  onSettled?: () => void
}) {
  const { signOut, isLoading } = useSignOut()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => setModalOpen(true)}
        className="bg-neutral-900 rounded-full border border-neutral-800 px-4 py-2 text-sm text-white font-medium hover:border-neutral-700"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>

      <button
        onClick={() => signOut()}
        disabled={isLoading}
        aria-label="Disconnect"
        className="bg-neutral-900 rounded-full border border-neutral-800 p-2 text-neutral-400 hover:text-white hover:border-neutral-700 disabled:opacity-50"
      >
        <LogoutIcon />
      </button>

      {modalOpen && (
        <WalletModal address={address} demo={demo} onClose={() => setModalOpen(false)} onSettled={onSettled} />
      )}
    </div>
  )
}
