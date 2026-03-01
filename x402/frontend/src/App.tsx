import { useCallback, useEffect, useState } from 'react'
import { BackendWalletExperience } from './features/backend-wallet'
import { PayToAddressExperience } from './features/pay-to-address'
import { PaywallExperience } from './features/paywall'

type Tab = 'embedded' | 'backend' | 'pay-to'

function getTabFromHash(): Tab {
  if (typeof window === 'undefined') return 'embedded'
  const hash = window.location.hash
  if (hash === '#backend-wallet') return 'backend'
  if (hash === '#pay-to-address') return 'pay-to'
  return 'embedded'
}

function App() {
  const [tab, setTab] = useState<Tab>(getTabFromHash)

  useEffect(() => {
    const onHashChange = () => setTab(getTabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setHash = useCallback((t: Tab) => {
    if (t === 'backend') window.location.hash = '#backend-wallet'
    else if (t === 'pay-to') window.location.hash = '#pay-to-address'
    else window.location.hash = ''
  }, [])

  return (
    <div className="min-h-screen bg-zinc-900">
      <nav className="border-b border-zinc-700 bg-zinc-800 px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHash('embedded')}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'embedded'
                ? 'bg-primary text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Embedded wallet
          </button>
          <button
            type="button"
            onClick={() => setHash('backend')}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'backend'
                ? 'bg-primary text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Backend wallet
          </button>
          <button
            type="button"
            onClick={() => setHash('pay-to')}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'pay-to'
                ? 'bg-primary text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pay-to address
          </button>
        </div>
      </nav>
      {tab === 'embedded' && <PaywallExperience />}
      {tab === 'backend' && <BackendWalletExperience />}
      {tab === 'pay-to' && <PayToAddressExperience />}
    </div>
  )
}

export default App
