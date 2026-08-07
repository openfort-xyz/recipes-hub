import { useOpenfort, useUser } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import type { CSSProperties } from 'react'
import { useAccount } from 'wagmi'
import { Dashboard } from './components/Dashboard'
import { PhoneFrame } from './components/PhoneFrame'
import { fontStack, vars } from './components/styles'
import { Spinner } from './components/ui'
import { ACCOUNT_TYPE, Providers } from './openfort/Providers'
import { Auth } from './screens/Auth'
import { Wallets } from './screens/Wallets'

const HAS_KEYS = Boolean(
  import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY && import.meta.env.VITE_OPENFORT_SHIELD_KEY
)

type Step = 'loading' | 'auth' | 'wallet' | 'dashboard'

function useStep(): Step {
  const { isLoading } = useOpenfort()
  const { isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const wallet = useEthereumEmbeddedWallet()
  const busy = wallet.status === 'fetching-wallets' || wallet.isConnecting

  if (isLoading) return 'loading'
  if (isAuthenticated && busy) return 'loading'
  if (!isAuthenticated) return 'auth'
  if (!isConnected || wallet.activeWallet?.accountType !== ACCOUNT_TYPE) return 'wallet'
  return 'dashboard'
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...(vars as CSSProperties), ...rootStyle }}>
      <PhoneFrame>{children}</PhoneFrame>
    </div>
  )
}

function Shell() {
  const step = useStep()
  return (
    <Stage>
      {step === 'loading' && <Spinner />}
      {step === 'auth' && <Auth />}
      {step === 'wallet' && <Wallets />}
      {step === 'dashboard' && <Dashboard />}
    </Stage>
  )
}

export default function App() {
  if (!HAS_KEYS) return <ConfigNotice />
  return (
    <Providers>
      <Shell />
    </Providers>
  )
}

function ConfigNotice() {
  return (
    <Stage>
      <div style={{ padding: '8px 4px' }}>
        <h1 style={{ margin: 0, fontFamily: fontStack, fontWeight: 700, fontSize: '1.15rem' }}>
          Configuration needed
        </h1>
        <p
          style={{
            marginTop: 10,
            fontFamily: fontStack,
            fontSize: '0.85rem',
            color: 'var(--pd-ink-500)',
            lineHeight: 1.55,
          }}
        >
          Copy <code>.env.example</code> → <code>.env</code> and set your <strong>live</strong>{' '}
          Openfort keys (<code>VITE_OPENFORT_PUBLISHABLE_KEY</code>,{' '}
          <code>VITE_OPENFORT_SHIELD_KEY</code>) plus a mainnet RPC (
          <code>VITE_MAINNET_RPC_URL</code>). This demo runs on Ethereum mainnet, so test keys won't
          work.
        </p>
      </div>
    </Stage>
  )
}

const rootStyle: CSSProperties = {
  fontFamily: fontStack,
  color: 'var(--pd-ink-900)',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: 'radial-gradient(1200px 600px at 50% -10%, #ffe9e6 0%, var(--demo-bg) 55%)',
  animation: 'pd-fade-in .6s ease forwards',
}
