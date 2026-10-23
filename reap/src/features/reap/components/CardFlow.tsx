'use client'

import { OpenfortButton } from '@openfort/react'
import { ArrowDownLeft, ChevronLeft, CreditCard, Eye, ShoppingBag } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useOpenfortWallet } from '@/features/openfort/hooks/use-openfort-wallet'
import { PhoneFrame } from '@/features/reap/components/PhoneFrame'
import { CHAIN_NAME } from '@/features/reap/constants'
import type { CardTransaction } from '@/features/reap/types'
import { useReap } from '@/features/reap/use-reap'

type Reap = ReturnType<typeof useReap>
type Screen = 'home' | 'load' | 'purchase'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const bigButton = 'h-14 w-full rounded-full text-base'
const input =
  'h-14 rounded-2xl border bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring'

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 px-4">
      <button type="button" aria-label="Back" onClick={onBack} className="rounded-full p-1.5 hover:bg-muted">
        <ChevronLeft className="size-5" />
      </button>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  )
}

/** Scrollable body with a pinned footer, the layout every screen shares. */
function Body({ children, footer, error }: { children: ReactNode; footer?: ReactNode; error?: string | null }) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        {children}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      {footer && <div className="grid shrink-0 gap-2 px-5 pb-8 pt-2">{footer}</div>}
    </>
  )
}

function Step({ title, text, children, reap }: { title: string; text: ReactNode; children?: ReactNode; reap: Reap }) {
  return (
    <Body footer={children} error={reap.error}>
      <div className="grid gap-2 pt-10">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </Body>
  )
}

function DetailsScreen({ reap }: { reap: Reap }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phoneNumber: '' })
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value })
  const complete = form.firstName.trim() && form.lastName.trim() && form.phoneNumber.trim()
  return (
    <Body
      error={reap.error}
      footer={
        <Button
          className={bigButton}
          disabled={!complete || reap.busy === 'state'}
          onClick={() => reap.submitDetails(form)}
        >
          {reap.busy === 'state' ? 'Saving…' : 'Continue'}
        </Button>
      }
    >
      <div className="grid gap-2 pt-10">
        <h2 className="text-2xl font-semibold">Who&apos;s the cardholder?</h2>
        <p className="text-sm text-muted-foreground">
          Reap issues the card in your legal name. The phone receives one-time codes for online purchases.
        </p>
      </div>
      <input className={input} placeholder="First name" autoComplete="given-name" onChange={set('firstName')} />
      <input className={input} placeholder="Last name" autoComplete="family-name" onChange={set('lastName')} />
      <input
        className={input}
        placeholder="+14155552671"
        autoComplete="tel"
        inputMode="tel"
        onChange={set('phoneNumber')}
      />
    </Body>
  )
}

function CardFace({ reap }: { reap: Reap }) {
  const card = reap.state?.card
  if (reap.revealUrl) {
    return (
      <div className="grid gap-2">
        {/* Reap renders the PAN inside its own page; it never passes through this app. */}
        <iframe title="Card details" src={reap.revealUrl} className="h-52 w-full rounded-2xl border-0 bg-muted" />
        <button type="button" className="text-xs text-muted-foreground underline" onClick={reap.hideCard}>
          Hide details
        </button>
      </div>
    )
  }
  return (
    <div className="flex aspect-[1.586] flex-col justify-between rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-950 p-5 text-white shadow-lg">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Virtual card</span>
        <CreditCard className="size-5 opacity-70" />
      </div>
      <div>
        <p className="font-mono text-lg tracking-widest">•••• •••• •••• {card?.last4 ?? '····'}</p>
        <div className="mt-1 flex justify-between text-xs opacity-70">
          <span>{card?.cardholderName}</span>
          <span>{card?.status}</span>
        </div>
      </div>
    </div>
  )
}

function Home({ reap, address, onOpen }: { reap: Reap; address: string; onOpen: (s: Screen) => void }) {
  const state = reap.state!
  const sandbox = state.environment === 'sandbox'
  const symbol = reap.token?.symbol ?? 'USDC'
  return (
    <Body error={reap.error}>
      <div className="flex items-center justify-between pt-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{sandbox ? 'Reap sandbox' : 'Reap'}</span>
        <OpenfortButton />
      </div>
      <div className="pt-4 text-center">
        <p className="text-sm text-muted-foreground">Card balance</p>
        <p className="text-5xl font-semibold tracking-tight">
          {state.balance ? usd.format(state.balance.availableBalance) : '—'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {reap.awaiting === 'deposit'
            ? 'Waiting for Reap to credit the deposit…'
            : `Wallet: ${reap.walletBalance ?? '—'} ${symbol} on ${CHAIN_NAME[reap.chainId] ?? `chain ${reap.chainId}`}`}
        </p>
      </div>
      <CardFace reap={reap} />
      <div className="grid grid-cols-3 gap-2">
        <Button className="h-14 rounded-full" onClick={() => onOpen('load')}>
          <ArrowDownLeft className="mr-1 size-4" /> Load
        </Button>
        <Button
          variant="secondary"
          className="h-14 rounded-full"
          disabled={reap.busy === 'reveal'}
          onClick={reap.reveal}
        >
          <Eye className="mr-1 size-4" /> Details
        </Button>
        <Button
          variant="secondary"
          className="h-14 rounded-full"
          disabled={!sandbox}
          onClick={() => onOpen('purchase')}
        >
          <ShoppingBag className="mr-1 size-4" /> Spend
        </Button>
      </div>
      {reap.lastPurchase && <PurchaseResult tx={reap.lastPurchase} />}
      {sandbox && Number(reap.walletBalance ?? 0) === 0 && (
        <p className="rounded-2xl border p-4 text-xs text-muted-foreground">
          The sandbox only credits Reap&apos;s test token, {symbol}. Ask your Reap contact to send some to{' '}
          <span className="break-all font-mono">{address}</span>.
        </p>
      )}
    </Body>
  )
}

function PurchaseResult({ tx }: { tx: CardTransaction }) {
  const declined = tx.status === 'DECLINED'
  // Approvals report amount as { authorized, current, … }; declines as a plain originalAmount.
  const amount = typeof tx.originalAmount === 'number' ? tx.originalAmount : (tx.amount?.current ?? 0)
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted p-4 text-sm">
      <span>{tx.merchant?.name ?? 'Purchase'}</span>
      <span className={declined ? 'text-destructive' : 'font-medium'}>
        {declined ? `Declined · ${tx.declineReason}` : `−${usd.format(amount)} · ${tx.status}`}
      </span>
    </div>
  )
}

function AmountScreen({
  title,
  action,
  busyLabel,
  busy,
  reap,
  onBack,
  onSubmit,
  merchant,
}: {
  title: string
  action: string
  busyLabel: string
  busy: boolean
  reap: Reap
  onBack: () => void
  onSubmit: (amount: string, merchant: string) => Promise<void>
  merchant?: boolean
}) {
  const [amount, setAmount] = useState('')
  const [merchantName, setMerchantName] = useState('Coffee Shop')
  return (
    <>
      <TopBar title={title} onBack={onBack} />
      <Body
        error={reap.error}
        footer={
          <Button
            className={bigButton}
            disabled={!amount || busy}
            onClick={async () => {
              await onSubmit(amount, merchantName)
              onBack()
            }}
          >
            {busy ? busyLabel : action}
          </Button>
        }
      >
        <label className="flex items-baseline justify-center gap-1 py-6 text-5xl font-semibold tracking-tight">
          <span className="text-muted-foreground">$</span>
          <input
            aria-label="Amount"
            className="w-40 bg-transparent text-center outline-none placeholder:text-muted-foreground/50"
            placeholder="0"
            inputMode="decimal"
            disabled={busy}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </label>
        {merchant ? (
          <input
            className={input}
            aria-label="Merchant"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Sends {reap.token?.symbol} from your wallet to your card account. Gas is sponsored.
          </p>
        )}
      </Body>
    </>
  )
}

export default function CardFlow() {
  const [screen, setScreen] = useState<Screen>('home')
  const wallet = useOpenfortWallet()
  const reap = useReap()
  const state = reap.state

  let content: ReactNode
  if (!wallet.isReady) {
    content = (
      <Body footer={<OpenfortButton label="Get started" />}>
        <div className="flex flex-1 flex-col justify-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">A card on your wallet.</h1>
          <p className="text-muted-foreground">
            Load a Visa card with stablecoins from your own wallet and spend anywhere cards are accepted.
          </p>
        </div>
      </Body>
    )
  } else if (reap.needsDetails) {
    content = <DetailsScreen reap={reap} />
  } else if (!state) {
    content = (
      <Step
        reap={reap}
        title="Setting up"
        text={reap.busy === 'state' ? 'Loading your card…' : 'Something went wrong.'}
      />
    )
  } else if (state.kycStatus !== 'APPROVED') {
    content =
      state.environment === 'sandbox' ? (
        <Step
          reap={reap}
          title="Verify your identity"
          text={`Status: ${state.kycStatus}. In production the user completes Reap's KYC here. The sandbox approves it on request.`}
        >
          <Button className={bigButton} disabled={Boolean(reap.busy || reap.awaiting)} onClick={reap.simulateKyc}>
            {reap.awaiting === 'kyc' ? 'Waiting for approval…' : 'Approve KYC (sandbox)'}
          </Button>
        </Step>
      ) : (
        <Step
          reap={reap}
          title="Verify your identity"
          text={`Status: ${state.kycStatus}. Run Reap's managed KYC (POST /users/{id}/application) to continue.`}
        />
      )
  } else if (!state.account) {
    content = (
      <Step
        reap={reap}
        title="Open your card account"
        text="Your wallet signs a message to become the account's signer. Only that signature can move funds out."
      >
        <Button className={bigButton} disabled={reap.busy === 'account'} onClick={reap.openAccount}>
          {reap.busy === 'account' ? 'Signing…' : 'Sign and open account'}
        </Button>
      </Step>
    )
  } else if (screen === 'load') {
    content = (
      <AmountScreen
        title="Load card"
        action="Load card"
        busyLabel="Sending…"
        busy={reap.busy === 'deposit'}
        reap={reap}
        onBack={() => setScreen('home')}
        onSubmit={(amount) => reap.deposit(amount)}
      />
    )
  } else if (screen === 'purchase') {
    content = (
      <AmountScreen
        title="Simulate a purchase"
        action="Swipe card"
        busyLabel="Authorizing…"
        busy={reap.busy === 'purchase'}
        reap={reap}
        merchant
        onBack={() => setScreen('home')}
        onSubmit={reap.purchase}
      />
    )
  } else {
    content = <Home reap={reap} address={wallet.address} onOpen={setScreen} />
  }

  return <PhoneFrame>{content}</PhoneFrame>
}
