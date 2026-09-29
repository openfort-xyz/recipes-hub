'use client'

import { OpenfortButton } from '@openfort/react'
import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BankAccountForm } from '@/features/grid/components/BankAccountForm'
import { CHAIN_NAME, TERMINAL_STATUSES } from '@/features/grid/constants'
import type { Quote } from '@/features/grid/types'
import { type Direction, type PaymentStatus, useGrid } from '@/features/grid/use-grid'
import { useOpenfortWallet } from '@/features/openfort/hooks/use-openfort-wallet'

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

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

function StatusLine({ payment }: { payment: PaymentStatus | null }) {
  if (!payment) return null
  const done = payment.status === 'COMPLETED'
  const failed = TERMINAL_STATUSES.has(payment.status) && !done
  return (
    <p className={`text-sm ${done ? 'text-emerald-600 dark:text-emerald-400' : failed ? 'text-destructive' : ''}`}>
      {done ? 'Completed' : failed ? `Failed: ${payment.failureReason ?? payment.status}` : `${payment.status}…`}
      {payment.paymentRail && ` · ${payment.paymentRail}`}
    </p>
  )
}

function QuoteSummary({ quote, secondsLeft }: { quote: Quote; secondsLeft: number }) {
  return (
    <div className="grid gap-1 rounded-md bg-muted px-3 py-2 text-sm">
      <p>
        You send <strong>{formatAmount(quote.totalSendingAmount, quote.sendingCurrency)}</strong>, you get{' '}
        <strong>{formatAmount(quote.totalReceivingAmount, quote.receivingCurrency)}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Fee {formatAmount(quote.feesIncluded, quote.sendingCurrency)} ·{' '}
        {secondsLeft > 0 ? `rate locked for ${secondsLeft}s` : 'expired, get a new quote'}
      </p>
    </div>
  )
}

export default function FundingFlow() {
  const [direction, setDirection] = useState<Direction>('in')
  const [amount, setAmount] = useState('')
  const wallet = useOpenfortWallet()
  const grid = useGrid()

  const quote = grid.quote?.direction === direction ? grid.quote : null
  const secondsLeft = useSecondsLeft(quote?.expiresAt)
  const sandbox = grid.account?.environment === 'sandbox'
  const settled = Boolean(grid.payment && TERMINAL_STATUSES.has(grid.payment.status))

  if (!wallet.isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dollars in, dollars out</CardTitle>
          <CardDescription>
            Sign in to get an Openfort embedded wallet, then fund it from a bank account and cash it back out, with
            Lightspark Grid converting between USD and USDC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpenfortButton label="Sign in" />
        </CardContent>
      </Card>
    )
  }

  const bankInstruction = quote?.paymentInstructions.find((p) => p.accountOrWalletInfo.accountType === 'USD_ACCOUNT')

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="grid gap-1">
            <CardTitle>Wallet</CardTitle>
            <CardDescription>
              {grid.usdcBalance ?? '—'} USDC on {CHAIN_NAME[grid.chainId] ?? `chain ${grid.chainId}`}
              {sandbox && ' · Grid sandbox'}
            </CardDescription>
          </div>
          <OpenfortButton />
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex gap-2">
            {(['in', 'out'] as const).map((d) => (
              <Button
                key={d}
                variant={direction === d ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setDirection(d)}
              >
                {d === 'in' ? 'Add money' : 'Cash out'}
              </Button>
            ))}
          </div>
          {!grid.account && grid.busy === 'account' && (
            <p className="text-xs text-muted-foreground">Setting up your Grid customer…</p>
          )}
          {grid.error && <p className="text-sm text-destructive">{grid.error}</p>}
        </CardContent>
      </Card>

      {direction === 'out' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank account</CardTitle>
            <CardDescription>Where Grid pays the dollars once it receives your USDC.</CardDescription>
          </CardHeader>
          <CardContent>
            {grid.account?.bankAccount ? (
              <p className="text-sm">
                {grid.account.bankAccount.bankName} ····{grid.account.bankAccount.last4}
              </p>
            ) : (
              <BankAccountForm prefill={sandbox} busy={grid.busy === 'bank'} onSubmit={grid.linkBank} />
            )}
          </CardContent>
        </Card>
      )}

      <Card className={direction === 'out' && !grid.account?.bankAccount ? 'opacity-50' : undefined}>
        <CardHeader>
          <CardTitle className="text-base">
            {direction === 'in' ? 'Buy USDC with dollars' : 'Sell USDC for dollars'}
          </CardTitle>
          <CardDescription>
            {direction === 'in'
              ? 'Grid quotes the rate, you pay by bank transfer, Grid sends USDC to your wallet.'
              : 'Grid quotes the rate, your wallet sends USDC to a deposit address, Grid pays your bank.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Amount in USDC"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              disabled={!grid.account || !amount || grid.busy === 'quote'}
              onClick={() => grid.requestQuote(direction, amount)}
            >
              {grid.busy === 'quote' ? 'Quoting…' : 'Get quote'}
            </Button>
          </div>

          {quote && <QuoteSummary quote={quote} secondsLeft={secondsLeft} />}

          {quote && direction === 'in' && bankInstruction && (
            <div className="grid gap-1 font-mono text-xs">
              <p>Routing {bankInstruction.accountOrWalletInfo.routingNumber}</p>
              <p>Account {bankInstruction.accountOrWalletInfo.accountNumber}</p>
              <p>Reference {bankInstruction.accountOrWalletInfo.reference}</p>
              <p className="font-sans text-muted-foreground">
                Pay by {bankInstruction.accountOrWalletInfo.paymentRails?.join(', ')} and include the reference.
              </p>
            </div>
          )}

          {quote && direction === 'in' && sandbox && !grid.payment && (
            <Button
              variant="secondary"
              disabled={secondsLeft === 0 || grid.busy === 'simulate'}
              onClick={() => grid.simulateBankTransfer()}
            >
              {grid.busy === 'simulate' ? 'Sending…' : 'Simulate the bank transfer'}
            </Button>
          )}

          {quote && direction === 'out' && !grid.payment && (
            <Button disabled={secondsLeft === 0 || grid.busy === 'send'} onClick={() => grid.sendUsdc()}>
              {grid.busy === 'send'
                ? 'Sending USDC…'
                : `Send ${formatAmount(quote.totalSendingAmount, quote.sendingCurrency)}`}
            </Button>
          )}

          {grid.txHash && direction === 'out' && (
            <p className="font-mono text-xs text-muted-foreground">
              {grid.txHash.slice(0, 12)}…{grid.txHash.slice(-10)}
            </p>
          )}

          <StatusLine payment={grid.payment} />

          {settled && sandbox && direction === 'in' && (
            <p className="text-xs text-muted-foreground">
              Grid&apos;s sandbox settles on paper only: no USDC reaches the wallet. In production it lands on Base.
            </p>
          )}
          {settled && (
            <Button variant="secondary" size="sm" onClick={grid.clearQuote}>
              Start over
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
