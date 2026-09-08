import { useState } from 'react'
import type { DemoConfig } from '../config/demos'
import { SendForm } from './SendForm'

function SendIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ReceiveIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Deterministic gradient avatar seeded from the address - no external avatar lib needed. */
function Avatar({ address }: { address: string }) {
  let hash = 0
  for (const char of address) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const hue = hash % 360
  return (
    <div
      className="w-16 h-16 rounded-full"
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 60) % 360}, 70%, 45%))` }}
    />
  )
}

export function WalletModal({
  address,
  demo,
  onClose,
  onSettled,
}: {
  address: string
  demo: DemoConfig
  onClose: () => void
  onSettled?: () => void
}) {
  const [view, setView] = useState<'main' | 'send'>('main')
  const [copied, setCopied] = useState(false)

  async function handleReceive() {
    // Clipboard can be denied (unfocused document, no permission) - don't let it reject unhandled.
    await navigator.clipboard?.writeText(address).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xs p-6">
        <div className="flex items-center justify-between mb-4">
          {view === 'send' ? (
            <button onClick={() => setView('main')} className="text-neutral-400 hover:text-white">
              <BackIcon />
            </button>
          ) : (
            <span />
          )}
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <CloseIcon />
          </button>
        </div>

        {view === 'main' && (
          <>
            <div className="flex flex-col items-center gap-3">
              <Avatar address={address} />
              <div className="text-white font-medium">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setView('send')}
                className="flex flex-col items-center gap-2 bg-neutral-800 rounded-xl py-4 text-white hover:bg-neutral-700"
              >
                <SendIcon />
                <span className="text-xs">Send</span>
              </button>
              <button
                onClick={handleReceive}
                className="flex flex-col items-center gap-2 bg-neutral-800 rounded-xl py-4 text-white hover:bg-neutral-700"
              >
                <ReceiveIcon />
                <span className="text-xs">{copied ? 'Copied!' : 'Receive'}</span>
              </button>
            </div>
          </>
        )}

        {view === 'send' && <SendForm demo={demo} onSettled={onSettled} />}
      </div>
    </div>
  )
}
