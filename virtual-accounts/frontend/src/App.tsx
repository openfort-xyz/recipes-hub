import { AccountTypeEnum, useOpenfort, useUser } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import type { CSSProperties } from 'react'
import { useAccount } from 'wagmi'
import { fontStack, muted } from './components/styles'
import { Providers } from './openfort/Providers'
import { Auth } from './screens/Auth'
import { Dashboard } from './screens/Dashboard'
import { WalletGate } from './screens/WalletGate'

type Step = 'loading' | 'auth' | 'wallet' | 'dashboard'

function useStep(): Step {
  const { isLoading } = useOpenfort()
  const { isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const wallet = useEthereumEmbeddedWallet()

  if (isLoading) return 'loading'
  if (!isAuthenticated) return 'auth'
  if (wallet.status === 'fetching-wallets' || wallet.isConnecting) return 'loading'
  if (!isConnected || wallet.activeWallet?.accountType !== AccountTypeEnum.EOA) return 'wallet'
  return 'dashboard'
}

function Main() {
  const step = useStep()
  return (
    <main style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {step === 'loading' && <p style={muted}>Loading...</p>}
        {step === 'auth' && <Auth />}
        {step === 'wallet' && <WalletGate />}
        {step === 'dashboard' && <Dashboard />}
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Providers>
      <Main />
    </Providers>
  )
}

const pageStyle: CSSProperties = {
  fontFamily: fontStack,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}
