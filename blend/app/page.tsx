'use client'

import { useCallback, useEffect, useState } from 'react'

type Fiat = Record<string, number>
type Status = {
  address: string
  wallet: { usdc: string; eth: string }
  account: { accountId: string; safeAddress: string } | null
  balance: { total: Fiat } | null
  returns: { returns: Fiat; returnsPct: number } | null
  yield: { chainId: number; apy: number }[]
}
type Session = {
  intentId: string
  type: 'DEPOSIT' | 'WITHDRAW'
  status: string
  txHashes: string[]
  chainIds: number[]
  errorMessage: string | null
  quoteSummary: {
    inputAmountUsd?: string
    outputAmountUsd?: string
    totalAmount?: string
    feesUsd?: string
    totalFeesUsd?: string
  }
}

const units = (raw: string, decimals: number) =>
  (Number(raw) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 6 })
const fiat = (amount: Fiat | undefined) =>
  Object.entries(amount ?? {})
    .map(([currency, value]) => value.toLocaleString(undefined, { style: 'currency', currency }))
    .join(' · ') || '—'
const pct = (ratio: number) => `${(ratio * 100).toFixed(2)}%`

export default function Home() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<Status | null>(null)
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [max, setMax] = useState(false)
  const [quote, setQuote] = useState<Session | null>(null)
  const [result, setResult] = useState<Session | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const api = useCallback(
    async <T,>(path: string, body?: object): Promise<T> => {
      const res = await fetch(path, {
        method: body ? 'POST' : 'GET',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: body && JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
      return data
    },
    [token]
  )

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  const refresh = () => run('Loading treasury…', async () => setStatus(await api<Status>('/api/treasury')))

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem('admin-token') ?? '')
    } catch {}
  }, [])

  const saveToken = (value: string) => {
    setToken(value)
    try {
      sessionStorage.setItem('admin-token', value)
    } catch {}
  }

  const isMax = mode === 'withdraw' && max

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Institutional Earn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An Openfort backend wallet holds the treasury. Blend allocates its USDC across yield vaults on Base.
        </p>
      </header>

      <section className="flex gap-2">
        <label className="sr-only" htmlFor="token">
          Admin token
        </label>
        <input
          id="token"
          type="password"
          placeholder="TREASURY_ADMIN_TOKEN"
          value={token}
          onChange={(e) => saveToken(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={refresh}
          disabled={!token || !!busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Load
        </button>
      </section>

      {status && (
        <section className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-2">
          <Stat label="Treasury wallet" value={status.address} mono />
          <Stat label="Blend Safe" value={status.account?.safeAddress ?? 'Created on first deposit'} mono />
          <Stat label="Wallet USDC" value={units(status.wallet.usdc, 6)} />
          <Stat label="Wallet ETH (gas)" value={units(status.wallet.eth, 18)} />
          <Stat label="Earning in Blend" value={fiat(status.balance?.total)} />
          <Stat
            label="Returns"
            value={status.returns ? `${fiat(status.returns.returns)} (${pct(status.returns.returnsPct)})` : '—'}
          />
          <Stat label="Current APY" value={status.yield.map((y) => pct(y.apy)).join(' · ') || '—'} />
        </section>
      )}

      {status && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {(['deposit', 'withdraw'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setQuote(null)
                }}
                className={`flex-1 rounded-md px-3 py-1.5 capitalize ${mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              aria-label="Amount in USDC"
              inputMode="decimal"
              placeholder="Amount (USDC)"
              value={amount}
              disabled={isMax}
              onChange={(e) => {
                setAmount(e.target.value)
                setQuote(null)
              }}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            />
            {mode === 'withdraw' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={max} onChange={(e) => setMax(e.target.checked)} /> Max
              </label>
            )}
          </div>
          <button
            type="button"
            disabled={!!busy || (!isMax && !amount)}
            onClick={() =>
              run('Quoting…', async () => {
                setResult(null)
                setQuote(await api<Session>('/api/quote', { type: mode, amount, max: isMax }))
              })
            }
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Get quote
          </button>

          {quote && (
            <div className="flex flex-col gap-3 rounded-lg bg-muted p-3 text-sm">
              {quote.type === 'DEPOSIT' ? (
                <p>
                  Deposit ${quote.quoteSummary.inputAmountUsd} → ${quote.quoteSummary.outputAmountUsd} in Blend · fees $
                  {quote.quoteSummary.feesUsd}
                </p>
              ) : (
                <p>
                  Withdraw {units(quote.quoteSummary.totalAmount ?? '0', 6)} USDC to the treasury wallet · fees $
                  {quote.quoteSummary.totalFeesUsd}
                </p>
              )}
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  run('Executing — signing with the treasury wallet and waiting for Blend to settle…', async () => {
                    setResult(await api<Session>('/api/execute', { intentId: quote.intentId }))
                    setQuote(null)
                    setStatus(await api<Status>('/api/treasury'))
                  })
                }
                className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
              >
                Confirm {quote.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}
              </button>
            </div>
          )}
        </section>
      )}

      {busy && <p className="text-sm text-muted-foreground">{busy}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <section className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium">
            {result.type} {result.status}
            {result.errorMessage && ` — ${result.errorMessage}`}
          </p>
          <ul className="mt-2 flex flex-col gap-1 font-mono text-xs">
            {result.txHashes.map((hash, i) => (
              <li key={hash} className="break-all">
                {result.chainIds[i] === 8453 ? (
                  <a className="underline" href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noreferrer">
                    {hash}
                  </a>
                ) : (
                  `${result.chainIds[i]}: ${hash}`
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`truncate ${mono ? 'font-mono text-xs' : 'font-medium'}`} title={value}>
        {value}
      </div>
    </div>
  )
}
