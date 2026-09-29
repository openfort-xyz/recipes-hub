'use client'

import { OpenfortButton } from '@openfort/react'
import { ArrowDownLeft, ArrowUpRight, Check, ChevronLeft, Landmark, X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { Button } from '@/components/ui/button'
import { BankAccountForm } from '@/features/grid/components/BankAccountForm'
import { PhoneFrame } from '@/features/grid/components/PhoneFrame'
import { CHAIN_NAME, TERMINAL_STATUSES } from '@/features/grid/constants'
import type { Quote } from '@/features/grid/types'
import { type Direction, useGrid } from '@/features/grid/use-grid'
import { useOpenfortWallet } from '@/features/openfort/hooks/use-openfort-wallet'

type Grid = ReturnType<typeof useGrid>
type Screen = 'home' | Direction

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const bigButton = 'h-14 w-full rounded-full text-base'

function formatAmount(amount: number, currency: Quote['sendingCurrency']) {
  return `${formatUnits(BigInt(amount), currency.decimals)} ${currency.code}`
}

function useSecondsLeft(expiresAt?: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [expiresAt])
  return expiresAt ? Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1_000)) : 0
}

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
function Body({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">{children}</div>
      {footer && <div className="grid shrink-0 gap-2 px-5 pb-8 pt-2">{footer}</div>}
    </>
  )
}

function AmountInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <label className="flex items-baseline justify-center gap-1 py-6 text-5xl font-semibold tracking-tight">
      <span className="text-muted-foreground">$</span>
      <input
        aria-label="Amount"
        className="w-40 bg-transparent text-center outline-none placeholder:text-muted-foreground/50"
        placeholder="0"
        inputMode="decimal"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
      />
    </label>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function QuoteCard({ quote, secondsLeft, direction }: { quote: Quote; secondsLeft: number; direction: Direction }) {
  return (
    <div className="grid gap-2 rounded-2xl bg-muted p-4">
      <Row
        label={direction === 'in' ? 'You pay' : 'You send'}
        value={formatAmount(quote.totalSendingAmount, quote.sendingCurrency)}
      />
      <Row label="You receive" value={formatAmount(quote.totalReceivingAmount, quote.receivingCurrency)} />
      <Row label="Fee" value={formatAmount(quote.feesIncluded, quote.sendingCurrency)} />
      <Row label="Rate locked" value={secondsLeft > 0 ? `${secondsLeft}s` : 'Expired'} />
    </div>
  )
}

function BankDetails({ quote }: { quote: Quote }) {
  const bank = quote.paymentInstructions.find((p) => p.accountOrWalletInfo.accountType === 'USD_ACCOUNT')
  if (!bank) return null
  const info = bank.accountOrWalletInfo
  return (
    <div className="grid gap-2 rounded-2xl border p-4">
      <p className="text-sm font-medium">Send a bank transfer to</p>
      <Row label="Routing" value={<span className="font-mono">{info.routingNumber}</span>} />
      <Row label="Account" value={<span className="font-mono">{info.accountNumber}</span>} />
      <Row label="Reference" value={<span className="break-all font-mono text-xs">{info.reference}</span>} />
      <p className="text-xs text-muted-foreground">{info.paymentRails?.join(', ')} · include the reference</p>
    </div>
  )
}

function Done({ grid, direction, onDone }: { grid: Grid; direction: Direction; onDone: () => void }) {
  const failed = grid.payment?.status !== 'COMPLETED'
  const quote = grid.quote
  return (
    <Body
      footer={
        <Button className={bigButton} onClick={onDone}>
          Done
        </Button>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div
          className={`flex size-16 items-center justify-center rounded-full ${failed ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-600'}`}
        >
          {failed ? <X className="size-8" /> : <Check className="size-8" />}
        </div>
        <p className="text-2xl font-semibold">
          {failed ? 'Payment failed' : direction === 'in' ? 'Deposit complete' : 'Cash out sent'}
        </p>
        {quote && !failed && (
          <p className="text-muted-foreground">
            {formatAmount(quote.totalReceivingAmount, quote.receivingCurrency)}
            {direction === 'in'
              ? ' to your wallet'
              : ` to your bank${grid.payment?.paymentRail ? ` by ${grid.payment.paymentRail}` : ''}`}
          </p>
        )}
        {failed && (
          <p className="text-sm text-muted-foreground">{grid.payment?.failureReason ?? grid.payment?.status}</p>
        )}
        {!failed && direction === 'in' && grid.account?.environment === 'sandbox' && (
          <p className="max-w-[18rem] text-xs text-muted-foreground">
            Grid&apos;s sandbox settles on paper only: no USDC reaches the wallet. In production it lands on Base.
          </p>
        )}
      </div>
    </Body>
  )
}

function Home({ grid, onOpen }: { grid: Grid; onOpen: (s: Direction) => void }) {
  const balance = grid.usdcBalance === null ? '—' : usd.format(Number(grid.usdcBalance))
  return (
    <Body>
      <div className="flex items-center justify-between pt-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {grid.account?.environment === 'sandbox' ? 'Grid sandbox' : 'Grid'}
        </span>
        <OpenfortButton />
      </div>
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">Balance</p>
        <p className="text-5xl font-semibold tracking-tight">{balance}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          USDC on {CHAIN_NAME[grid.chainId] ?? `chain ${grid.chainId}`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button className="h-14 rounded-full text-base" disabled={!grid.account} onClick={() => onOpen('in')}>
          <ArrowDownLeft className="mr-1 size-5" /> Deposit
        </Button>
        <Button
          variant="secondary"
          className="h-14 rounded-full text-base"
          disabled={!grid.account}
          onClick={() => onOpen('out')}
        >
          <ArrowUpRight className="mr-1 size-5" /> Cash out
        </Button>
      </div>
      {grid.account?.bankAccount && (
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm">
          <Landmark className="size-5 text-muted-foreground" />
          <span>
            {grid.account.bankAccount.bankName} ····{grid.account.bankAccount.last4}
          </span>
        </div>
      )}
      {grid.account?.environment === 'sandbox' && Number(grid.usdcBalance ?? 0) === 0 && (
        <p className="rounded-2xl border p-4 text-xs text-muted-foreground">
          Sandbox deposits don&apos;t reach the wallet on-chain. To try Cash out, send this wallet Base Sepolia USDC
          from{' '}
          <a className="underline" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
            faucet.circle.com
          </a>
          .
        </p>
      )}
      {!grid.account && grid.busy === 'account' && (
        <p className="text-center text-xs text-muted-foreground">Setting up your account…</p>
      )}
    </Body>
  )
}

function NameScreen({ grid }: { grid: Grid }) {
  const [fullName, setFullName] = useState('')
  return (
    <Body
      footer={
        <Button
          className={bigButton}
          disabled={!fullName.trim() || grid.busy === 'account'}
          onClick={() => grid.submitName(fullName)}
        >
          {grid.busy === 'account' ? 'Saving…' : 'Continue'}
        </Button>
      }
    >
      <div className="grid gap-2 pt-10">
        <h2 className="text-2xl font-semibold">What&apos;s your legal name?</h2>
        <p className="text-sm text-muted-foreground">Grid opens your account in this name. First and last name.</p>
      </div>
      <input
        className="h-14 rounded-2xl border bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="First and last name"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
    </Body>
  )
}

function Transfer({ grid, direction, onBack }: { grid: Grid; direction: Direction; onBack: () => void }) {
  const [amount, setAmount] = useState('')
  const quote = grid.quote?.direction === direction ? grid.quote : null
  const secondsLeft = useSecondsLeft(quote?.expiresAt)
  const sandbox = grid.account?.environment === 'sandbox'
  const moving = Boolean(grid.payment && !TERMINAL_STATUSES.has(grid.payment.status))
  const title = direction === 'in' ? 'Deposit' : 'Cash out'

  if (grid.payment && !moving) return <Done grid={grid} direction={direction} onDone={onBack} />

  if (direction === 'out' && !grid.account?.bankAccount) {
    return (
      <>
        <TopBar title="Add a bank account" onBack={onBack} />
        <Body>
          <p className="text-sm text-muted-foreground">Where Grid pays the dollars once it receives your USDC.</p>
          <BankAccountForm prefill={sandbox} busy={grid.busy === 'bank'} onSubmit={grid.linkBank} />
          {grid.error && <p className="text-sm text-destructive">{grid.error}</p>}
        </Body>
      </>
    )
  }

  const footer = moving ? (
    <Button className={bigButton} disabled>
      {grid.payment?.status === 'PENDING' ? 'Waiting for Grid…' : 'Processing…'}
    </Button>
  ) : !quote || secondsLeft === 0 ? (
    <Button
      className={bigButton}
      disabled={!amount || grid.busy === 'quote'}
      onClick={() => grid.requestQuote(direction, amount)}
    >
      {grid.busy === 'quote' ? 'Getting a rate…' : quote ? 'Refresh rate' : 'Review'}
    </Button>
  ) : direction === 'in' ? (
    sandbox && (
      <Button className={bigButton} disabled={grid.busy === 'simulate'} onClick={() => grid.simulateBankTransfer()}>
        {grid.busy === 'simulate' ? 'Sending…' : 'Simulate the bank transfer'}
      </Button>
    )
  ) : (
    <Button className={bigButton} disabled={grid.busy === 'send'} onClick={() => grid.sendUsdc()}>
      {grid.busy === 'send'
        ? 'Sending USDC…'
        : `Cash out ${formatAmount(quote.totalSendingAmount, quote.sendingCurrency)}`}
    </Button>
  )

  return (
    <>
      <TopBar title={title} onBack={onBack} />
      <Body footer={footer}>
        <AmountInput value={amount} disabled={Boolean(quote) || moving} onChange={setAmount} />
        {direction === 'out' && grid.account?.bankAccount && (
          <p className="-mt-4 text-center text-sm text-muted-foreground">
            To {grid.account.bankAccount.bankName} ····{grid.account.bankAccount.last4}
          </p>
        )}
        {quote && <QuoteCard quote={quote} secondsLeft={secondsLeft} direction={direction} />}
        {quote && direction === 'in' && <BankDetails quote={quote} />}
        {grid.txHash && direction === 'out' && (
          <p className="text-center font-mono text-xs text-muted-foreground">
            {grid.txHash.slice(0, 10)}…{grid.txHash.slice(-8)}
          </p>
        )}
        {grid.error && <p className="text-sm text-destructive">{grid.error}</p>}
      </Body>
    </>
  )
}

export default function FundingFlow() {
  const [screen, setScreen] = useState<Screen>('home')
  const wallet = useOpenfortWallet()
  const grid = useGrid()

  const goHome = () => {
    grid.clearQuote()
    setScreen('home')
  }

  let content: ReactNode
  if (!wallet.isReady) {
    content = (
      <Body footer={<OpenfortButton label="Get started" />}>
        <div className="flex flex-1 flex-col justify-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">Dollars in, dollars out.</h1>
          <p className="text-muted-foreground">
            Deposit from your bank, cash out to your bank. Your balance lives in your own wallet.
          </p>
        </div>
      </Body>
    )
  } else if (grid.needsName) {
    content = <NameScreen grid={grid} />
  } else if (screen === 'home') {
    content = <Home grid={grid} onOpen={setScreen} />
  } else {
    content = <Transfer key={screen} grid={grid} direction={screen} onBack={goHome} />
  }

  return <PhoneFrame>{content}</PhoneFrame>
}
