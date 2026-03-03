import { useCallback, useEffect, useState } from 'react'
import { BackendWalletExperience } from './features/backend-wallet'
import { PaywallExperience } from './features/paywall'

type Tab = 'embedded' | 'backend'

function getTabFromHash(): Tab {
  if (typeof window === 'undefined') return 'embedded'
  const hash = window.location.hash
  if (hash === '#backend-wallet') return 'backend'
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
        </div>
      </nav>
      {tab === 'embedded' && <PaywallExperience />}
      {tab === 'backend' && <BackendWalletExperience />}
    </div>
  )
}

export default App
