import { OpenfortButton, useUser } from '@openfort/react'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ActionPanel } from './components/ActionPanel'
import { BorrowPanel } from './components/BorrowPanel'
import { DiscoverPanel } from './components/DiscoverPanel'
import { FixedTermPanel } from './components/FixedTermPanel'
import { PositionsPanel } from './components/PositionsPanel'
import { RewardsPanel } from './components/RewardsPanel'
import type { VaultOption } from './hooks/useDepositOptions'

type Tab = 'earn' | 'borrow' | 'fixed-term'

const TABS: { id: Tab; label: string }[] = [
  { id: 'earn', label: 'Earn' },
  { id: 'borrow', label: 'Borrow' },
  { id: 'fixed-term', label: 'Fixed-term' },
]

function App() {
  const { isAuthenticated } = useUser()
  const { address } = useAccount()
  const [selected, setSelected] = useState<VaultOption | null>(null)
  const [tab, setTab] = useState<Tab>('earn')

  return (
    <div className="min-h-screen bg-neutral-950 p-4 sm:p-8 font-figtree">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center pt-8 pb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Openfort × vaults.fyi</h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
            One API for every yield. Earn, borrow against collateral, and lock a fixed rate — deposits route directly to
            the canonical vault, with no wrapper contract or required user-facing fee.
          </p>
        </header>

        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 flex justify-center">
          <OpenfortButton />
        </div>

        {isAuthenticated && address && (
          <>
            <div className="flex gap-2 bg-neutral-900 rounded-2xl border border-neutral-800 p-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 text-sm font-medium py-2 rounded-xl transition ${
                    tab === t.id ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'earn' && (
              <>
                <DiscoverPanel userAddress={address} onSelect={(vault) => setSelected(vault)} />
                {selected && <ActionPanel userAddress={address} selected={selected} />}
                <PositionsPanel userAddress={address} />
                <RewardsPanel userAddress={address} />
              </>
            )}

            {tab === 'borrow' && <BorrowPanel userAddress={address} />}

            {tab === 'fixed-term' && <FixedTermPanel userAddress={address} />}
          </>
        )}
      </div>
    </div>
  )
}

export default App
