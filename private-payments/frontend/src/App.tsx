import { AccountTypeEnum, useOpenfort, useUser } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { type CSSProperties, useCallback, useState } from 'react'
import { useAccount } from 'wagmi'
import { PhoneFrame } from './components/PhoneFrame'
import { fontStack, vars } from './components/styles'
import { generateInvoice, type Invoice } from './lib/invoices'
import { Providers } from './openfort/Providers'
import { Auth } from './screens/Auth'
import { PayerDashboard } from './screens/PayerDashboard'
import { SupplierPanel } from './screens/SupplierPanel'
import { Wallets } from './screens/Wallets'
import { UnlinkBootstrap } from './unlink/UnlinkBootstrap'

type Step = 'loading' | 'auth' | 'wallet' | 'dashboard'

function useStep(): Step {
  const { isLoading: isSdkLoading } = useOpenfort()
  const { isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const wallet = useEthereumEmbeddedWallet()
  const isLoadingWallets = wallet.status === 'fetching-wallets'
  const isConnecting = wallet.isConnecting
  const activeWallet = wallet.activeWallet

  if (isSdkLoading) return 'loading'
  if (isAuthenticated && (isLoadingWallets || isConnecting)) return 'loading'
  if (!isAuthenticated) return 'auth'
  if (!isConnected || !activeWallet || activeWallet.accountType !== AccountTypeEnum.EOA)
    return 'wallet'
  return 'dashboard'
}

function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 32,
      }}
    >
      <svg
        viewBox="0 0 50 50"
        style={{ width: 48, height: 48, animation: 'pd-spin 1s linear infinite' }}
      >
        <circle
          cx={25}
          cy={25}
          r={20}
          fill="none"
          strokeWidth={4}
          stroke="var(--pd-surface-muted)"
        />
        <circle
          cx={25}
          cy={25}
          r={20}
          fill="none"
          strokeWidth={4}
          stroke="var(--pd-brand)"
          strokeLinecap="round"
          strokeDasharray="80 46"
        />
      </svg>
      <span
        style={{
          fontFamily: fontStack,
          fontSize: '0.85rem',
          color: 'var(--pd-ink-500)',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function MainContent() {
  const step = useStep()
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const handleGenerateInvoice = useCallback(() => {
    setInvoices((prev) => [generateInvoice(), ...prev])
  }, [])

  const handleInvoiceStatusChange = useCallback(
    (id: string, status: Invoice['status'], extra?: { txHash?: string; private?: boolean }) => {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? {
                ...inv,
                status,
                ...(extra?.txHash ? { txHash: extra.txHash } : {}),
                ...(extra?.private !== undefined ? { private: extra.private } : {}),
              }
            : inv
        )
      )
    },
    []
  )

  return (
    <div style={{ ...(vars as CSSProperties), ...rootStyle }}>
      <PhoneFrame
        width={320}
        height={600}
        borderRadius={32}
        borderWidth={6}
        contentPadding="8px 14px 14px"
      >
        {step === 'loading' && <Spinner />}
        {step === 'auth' && <Auth />}
        {step === 'wallet' && <Wallets />}
        {step === 'dashboard' && (
          <UnlinkBootstrap fallback={<Spinner label="Setting up your private account..." />}>
            <PayerDashboard invoices={invoices} onInvoiceStatusChange={handleInvoiceStatusChange} />
          </UnlinkBootstrap>
        )}
      </PhoneFrame>

      {step === 'dashboard' && (
        <SupplierPanel invoices={invoices} onGenerateInvoice={handleGenerateInvoice} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <Providers>
      <MainContent />
    </Providers>
  )
}

const rootStyle: CSSProperties = {
  fontFamily: fontStack,
  color: 'var(--pd-ink-900)',
  minHeight: '100vh',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
  padding: 24,
  animation: 'pd-fade-in .6s ease forwards',
}
