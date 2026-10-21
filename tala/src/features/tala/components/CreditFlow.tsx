'use client'

import { OpenfortButton } from '@openfort/react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useOpenfortWallet } from '@/features/openfort/hooks/use-openfort-wallet'
import { PhoneFrame } from '@/features/tala/components/PhoneFrame'
import { CHAIN_NAME, PHONE_REGEX } from '@/features/tala/constants'
import type { LoanOffer, Money } from '@/features/tala/types'
import { useCredit } from '@/features/tala/use-credit'

type Credit = ReturnType<typeof useCredit>

const bigButton = 'h-14 w-full rounded-full text-base'
const input =
  'h-14 rounded-2xl border bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring'

function format(money: Money) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: money.isoCode }).format(money.amount)
  } catch {
    return `${money.amount} ${money.isoCode}`
  }
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function Header({ credit }: { credit: Credit }) {
  const balance = credit.usdcBalance === null ? '—' : `${Number(credit.usdcBalance).toFixed(2)} USDC`
  return (
    <>
      <div className="flex items-center justify-between pt-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {credit.state?.environment === 'mock' ? 'Mock Tala' : 'Tala'}
        </span>
        <OpenfortButton />
      </div>
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">Wallet balance</p>
        <p className="text-4xl font-semibold tracking-tight">{balance}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          on {CHAIN_NAME[credit.chainId] ?? `chain ${credit.chainId}`}
        </p>
      </div>
    </>
  )
}

function PhoneInput({ credit }: { credit: Credit }) {
  return (
    <input
      className={input}
      placeholder="+254712345678"
      autoComplete="tel"
      inputMode="tel"
      aria-label="Phone number"
      value={credit.phone}
      onChange={(e) => credit.setPhone(e.target.value.replace(/[^\d+]/g, ''))}
    />
  )
}

function Enroll({ credit }: { credit: Credit }) {
  return (
    <Body
      footer={
        <Button
          className={bigButton}
          disabled={!PHONE_REGEX.test(credit.phone) || credit.busy === 'enroll'}
          onClick={credit.enroll}
        >
          {credit.busy === 'enroll' ? 'Checking…' : 'Check my credit'}
        </Button>
      }
    >
      <Header credit={credit} />
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold">See what you can borrow</h2>
        <p className="text-sm text-muted-foreground">
          Tala decides from your phone number and history, with no collateral. Checking doesn&apos;t commit you.
        </p>
      </div>
      <PhoneInput credit={credit} />
      {credit.error && <p className="text-sm text-destructive">{credit.error}</p>}
    </Body>
  )
}

function Borrow({
  credit,
  offer,
}: {
  credit: Credit
  offer: Required<Pick<LoanOffer, 'creditLimit' | 'durationDays'>>
}) {
  const { minimum, maximum, incrementAmount } = offer.creditLimit
  const [amount, setAmount] = useState(minimum.amount)
  const [duration, setDuration] = useState(offer.durationDays.minimum)
  const terms = credit.terms

  return (
    <Body
      footer={
        terms ? (
          <Button className={bigButton} disabled={credit.busy === 'borrow'} onClick={credit.borrow}>
            {credit.busy === 'borrow' ? 'Booking the loan…' : `Borrow ${format(terms.loanAmount)}`}
          </Button>
        ) : (
          <Button
            className={bigButton}
            disabled={credit.busy === 'terms'}
            onClick={() => credit.quote(amount, duration)}
          >
            {credit.busy === 'terms' ? 'Getting terms…' : 'Review terms'}
          </Button>
        )
      }
    >
      <Header credit={credit} />
      <p className="text-sm text-muted-foreground">
        You&apos;re approved for up to <span className="font-medium text-foreground">{format(maximum)}</span>.
      </p>
      <label className="grid gap-2 text-sm">
        <Row label="Amount" value={format({ ...minimum, amount })} />
        <input
          type="range"
          min={minimum.amount}
          max={maximum.amount}
          step={incrementAmount.amount || 1}
          value={amount}
          onChange={(e) => {
            setAmount(Number(e.target.value))
            credit.clearTerms() // the quoted terms no longer apply
          }}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <Row label="Repay in" value={`${duration} days`} />
        <input
          type="range"
          min={offer.durationDays.minimum}
          max={offer.durationDays.maximum}
          value={duration}
          onChange={(e) => {
            setDuration(Number(e.target.value))
            credit.clearTerms()
          }}
        />
      </label>
      {terms && (
        <div className="grid gap-2 rounded-2xl bg-muted p-4">
          <Row label="You receive" value={`${format(terms.terms.totalPrincipal)} in USDC`} />
          <Row label="Interest" value={format(terms.terms.totalInterest)} />
          <Row label="Fees" value={format(terms.terms.totalProcessingFee)} />
          <Row label="You repay" value={format(terms.terms.totalBalance)} />
          <Row label="Due" value={terms.dueDate} />
        </div>
      )}
      {credit.error && <p className="text-sm text-destructive">{credit.error}</p>}
    </Body>
  )
}

function Repay({ credit }: { credit: Credit }) {
  const loan = credit.state?.loan
  const owed = loan?.outstandingBalances?.totalBalance
  const [amount, setAmount] = useState(owed ? String(owed.amount) : '')

  return (
    <Body
      footer={
        <Button
          className={bigButton}
          disabled={!amount || !PHONE_REGEX.test(credit.phone) || credit.busy === 'repay'}
          onClick={() => credit.repay(amount)}
        >
          {credit.busy === 'repay' ? 'Repaying…' : `Repay ${amount || '0'} USDC`}
        </Button>
      }
    >
      <Header credit={credit} />
      <div className="grid gap-2 rounded-2xl bg-muted p-4">
        <Row label="Loan" value={<span className="font-mono text-xs">{loan?.loanId}</span>} />
        <Row label="Status" value={loan?.status} />
        {owed && <Row label="Outstanding" value={format(owed)} />}
        {loan?.dueDate && <Row label="Due" value={loan.dueDate} />}
      </div>
      {loan?.status === 'disbursement' ? (
        <p className="text-sm text-muted-foreground">Tala is paying the loan out to your wallet.</p>
      ) : (
        <>
          <input
            className={input}
            aria-label="Repayment amount in USDC"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          />
          {!PHONE_REGEX.test(credit.phone) && <PhoneInput credit={credit} />}
        </>
      )}
      {credit.state?.environment === 'mock' && (
        <p className="rounded-2xl border p-4 text-xs text-muted-foreground">
          Mock mode books the loan without paying it out. Repaying sends real Base Sepolia USDC; get some from{' '}
          <a className="underline" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
            faucet.circle.com
          </a>
          .
        </p>
      )}
      {credit.error && <p className="text-sm text-destructive">{credit.error}</p>}
    </Body>
  )
}

function Message({ credit, title, text }: { credit: Credit; title: string; text?: string }) {
  return (
    <Body>
      <Header credit={credit} />
      <h2 className="text-2xl font-semibold">{title}</h2>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      {credit.error && <p className="text-sm text-destructive">{credit.error}</p>}
    </Body>
  )
}

export default function CreditFlow() {
  const wallet = useOpenfortWallet()
  const credit = useCredit()
  const offer = credit.offer

  let content: ReactNode
  if (!wallet.isReady) {
    content = (
      <Body footer={<OpenfortButton label="Get started" />}>
        <div className="flex flex-1 flex-col justify-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">Credit, straight to your wallet.</h1>
          <p className="text-muted-foreground">Borrow without collateral, receive USDC, repay from the same wallet.</p>
        </div>
      </Body>
    )
  } else if (!credit.state) {
    content = <Message credit={credit} title="Loading…" />
  } else if (credit.state.loan) {
    content = <Repay key={credit.state.loan.loanId} credit={credit} />
  } else if (!offer || offer.status === 'not_enrolled') {
    content = <Enroll credit={credit} />
  } else if (offer.status === 'offer_available' && offer.creditLimit && offer.durationDays) {
    content = <Borrow credit={credit} offer={{ creditLimit: offer.creditLimit, durationDays: offer.durationDays }} />
  } else if (offer.status === 'offer_processing') {
    content = (
      <Message credit={credit} title="Tala is reviewing your application…" text="This usually takes a moment." />
    )
  } else if (offer.status === 'rejected') {
    content = <Message credit={credit} title="No offer right now" text="Tala couldn't approve a loan this time." />
  } else {
    content = (
      <Message
        credit={credit}
        title="Tala needs more information"
        text={'message' in offer ? offer.message : undefined}
      />
    )
  }

  return <PhoneFrame>{content}</PhoneFrame>
}
