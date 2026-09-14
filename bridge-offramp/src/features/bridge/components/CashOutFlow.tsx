'use client'

import { OpenfortButton } from '@openfort/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BankAccountForm } from '@/features/bridge/components/BankAccountForm'
import { DrainTimeline } from '@/features/bridge/components/DrainTimeline'
import { CHAIN_NAME, RAIL_LABEL } from '@/features/bridge/constants'
import { useCashOut } from '@/features/bridge/use-cash-out'
import { useOpenfortWallet } from '@/features/openfort/hooks/use-openfort-wallet'

export default function CashOutFlow() {
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')
  const [fullName, setFullName] = useState('')
  const [amount, setAmount] = useState('')
  const wallet = useOpenfortWallet()
  const flow = useCashOut(currency)

  const verified = flow.account?.kycStatus === 'approved'
  const hasBank = Boolean(flow.bankAccount)
  const hasAddress = Boolean(flow.cashOutAddress)

  if (!wallet.isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash out to your bank</CardTitle>
          <CardDescription>
            Sign in to get an Openfort embedded wallet, then move USDC out of it to a real bank account through Bridge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpenfortButton label="Sign in to cash out" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="grid gap-1">
            <CardTitle>Cash out</CardTitle>
            <CardDescription>
              {flow.usdcBalance ?? '—'} USDC on {CHAIN_NAME[wallet.chainId ?? 0] ?? `chain ${wallet.chainId}`}
              {flow.account?.environment === 'sandbox' && ' · Bridge sandbox'}
            </CardDescription>
          </div>
          <OpenfortButton />
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex gap-2">
            {(['usd', 'eur'] as const).map((c) => (
              <Button
                key={c}
                variant={currency === c ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setCurrency(c)}
              >
                {c === 'usd' ? 'USD · ACH' : 'EUR · SEPA'}
              </Button>
            ))}
          </div>
          {flow.error && <p className="text-sm text-destructive">{flow.error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Verify your identity</CardTitle>
          <CardDescription>
            Bridge creates the customer record when it approves your KYC link — accept the terms first, then complete
            the hosted flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {verified ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Verified</p>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Full legal name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Button disabled={!fullName || flow.busy === 'kyc'} onClick={() => flow.startKyc(fullName)}>
                  {flow.busy === 'kyc' ? 'Opening…' : 'Start'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Status: {flow.account?.kycStatus ?? 'not started'}
                {flow.account?.kycLinkId && ' · reopen the tabs if you closed them, then refresh'}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => flow.refresh()}>
                  Refresh status
                </Button>
                {flow.account?.environment === 'sandbox' && flow.account.customerId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={flow.busy === 'simulate'}
                    onClick={() => flow.simulateApproval()}
                  >
                    Simulate approval
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className={verified ? undefined : 'opacity-50'}>
        <CardHeader>
          <CardTitle className="text-base">2. Link the bank account</CardTitle>
          <CardDescription>Where Bridge sends the fiat once it converts your USDC.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasBank ? (
            <p className="text-sm">
              {flow.bankAccount?.bankName} ····{flow.bankAccount?.last4} ({currency.toUpperCase()})
            </p>
          ) : verified ? (
            <BankAccountForm currency={currency} busy={flow.busy === 'bank'} onSubmit={flow.linkBank} />
          ) : (
            <p className="text-sm text-muted-foreground">Verify your identity first.</p>
          )}
        </CardContent>
      </Card>

      <Card className={hasBank ? undefined : 'opacity-50'}>
        <CardHeader>
          <CardTitle className="text-base">3. Get your cash-out address</CardTitle>
          <CardDescription>
            A permanent address. Anything sent to it converts and pays out to the account above — no API call per
            cash-out.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {hasAddress ? (
            <>
              <code className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
                {flow.cashOutAddress?.address}
              </code>
              <p className="text-xs text-muted-foreground">
                {RAIL_LABEL[flow.cashOutAddress?.rail ?? 'ach']} → {currency.toUpperCase()} · Bridge chain{' '}
                {flow.cashOutAddress?.chain}
              </p>
            </>
          ) : (
            <Button disabled={!hasBank || flow.busy === 'address'} onClick={() => flow.createCashOutAddress()}>
              {flow.busy === 'address' ? 'Creating…' : 'Create cash-out address'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className={hasAddress ? undefined : 'opacity-50'}>
        <CardHeader>
          <CardTitle className="text-base">4. Send USDC</CardTitle>
          <CardDescription>
            The embedded wallet builds the transfer — the user never copies an address. Gas is sponsored, so no ETH is
            needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex gap-2">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Amount in USDC"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              disabled={!hasAddress || !amount || flow.busy === 'cashout' || flow.isConfirming}
              onClick={() => flow.cashOut(amount)}
            >
              {flow.busy === 'cashout' ? 'Sending…' : flow.isConfirming ? 'Confirming…' : 'Cash out'}
            </Button>
          </div>
          {flow.pendingTx && (
            <p className="font-mono text-xs text-muted-foreground">
              {flow.pendingTx.slice(0, 12)}…{flow.pendingTx.slice(-10)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Track it</CardTitle>
          <CardDescription>Drains move forward only: received → sent to your bank → arrived.</CardDescription>
        </CardHeader>
        <CardContent>
          <DrainTimeline drains={flow.drains} simulated={flow.simulated} />
        </CardContent>
      </Card>
    </div>
  )
}
