import { OpenfortButton } from '@openfort/react'
import { useSolanaEmbeddedWallet, useSolanaWalletAssets } from '@openfort/react/solana'
import { useState } from 'react'
import { fromBaseUnits, toBaseUnits } from './ondo/amounts.ts'
import { getQuote, getSwapTransaction, type Quote } from './ondo/jupiter.ts'
import { signAndSend } from './ondo/send.ts'
import { ONDO_TOKENS, USDC } from './ondo/tokens.ts'
import { RPC_URL } from './Providers.tsx'

const ELIGIBILITY_URL = 'https://docs.ondo.finance/ondo-stocks/eligibility'

export default function App() {
  const [eligible, setEligible] = useState(false)

  return (
    <main>
      <header>
        <h1>Tokenized stocks with Ondo</h1>
        <OpenfortButton />
      </header>
      <p className="notice" role="note">
        Ondo Global Markets tokens are not offered to U.S. persons or to anyone in a prohibited
        jurisdiction (including Canada and sanctioned countries), and are limited to professional or
        qualified investors in the UK, EEA, Switzerland and others. They are not shares and carry no
        voting rights. <a href={ELIGIBILITY_URL}>Eligibility rules</a>.
      </p>
      {eligible ? (
        <Trade />
      ) : (
        <label className="card attest">
          <input type="checkbox" onChange={(e) => setEligible(e.target.checked)} />I confirm I am
          not a U.S. person, I am not located in or resident of a prohibited jurisdiction, and I
          meet the eligibility requirements for my country.
        </label>
      )}
    </main>
  )
}

function Trade() {
  const solana = useSolanaEmbeddedWallet()
  const assets = useSolanaWalletAssets()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [stock, setStock] = useState(ONDO_TOKENS[0] ?? USDC)
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)

  if (solana.status !== 'connected') {
    return <p className="card">Sign in to get a Solana wallet.</p>
  }
  const provider = solana.provider

  const [input, output] = side === 'buy' ? [USDC, stock] : [stock, USDC]
  const balance = (mint: string) => assets.data?.find((a) => a.mint === mint)?.amount ?? 0n
  const sol = assets.data?.find((a) => a.isNative)?.amount ?? 0n

  const run = async (step: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await step()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const review = () =>
    run(async () => {
      setTxSignature(null)
      const units = toBaseUnits(amount, input.decimals)
      if (!units) throw new Error(`Enter a valid ${input.symbol} amount`)
      if (units > balance(input.mint)) throw new Error(`Not enough ${input.symbol}`)
      setQuote(await getQuote(input.mint, output.mint, units))
    })

  const swap = () =>
    run(async () => {
      if (!quote) return
      const transaction = await getSwapTransaction(quote, provider.publicKey)
      setTxSignature(await signAndSend(provider, RPC_URL, transaction))
      setQuote(null)
      setAmount('')
      await assets.refetch()
    })

  const reset = () => {
    setQuote(null)
    setError(null)
  }

  return (
    <>
      <section className="card">
        <h2>Balances</h2>
        <p className="muted">{solana.address}</p>
        <ul>
          <li>
            SOL <span>{fromBaseUnits(sol, 9)}</span>
          </li>
          {[USDC, ...ONDO_TOKENS].map((t) => (
            <li key={t.mint}>
              {t.symbol} <span>{fromBaseUnits(balance(t.mint), t.decimals)}</span>
            </li>
          ))}
        </ul>
        {sol === 0n && (
          <p className="muted">Send a little SOL for network fees, plus USDC to buy.</p>
        )}
      </section>

      <section className="card">
        <div className="tabs">
          {(['buy', 'sell'] as const).map((s) => (
            <button
              key={s}
              aria-pressed={side === s}
              onClick={() => {
                setSide(s)
                reset()
              }}
            >
              {s === 'buy' ? 'Buy' : 'Sell'}
            </button>
          ))}
        </div>
        <label>
          Stock
          <select
            value={stock.mint}
            onChange={(e) => {
              setStock(ONDO_TOKENS.find((t) => t.mint === e.target.value) ?? stock)
              reset()
            }}
          >
            {ONDO_TOKENS.map((t) => (
              <option key={t.mint} value={t.mint}>
                {t.symbol} · {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount ({input.symbol})
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              reset()
            }}
          />
        </label>

        {quote ? (
          <>
            <dl>
              <dt>You receive</dt>
              <dd>
                ≈ {fromBaseUnits(quote.outAmount, output.decimals)} {output.symbol}
              </dd>
              <dt>Minimum (3% slippage)</dt>
              <dd>
                {fromBaseUnits(quote.otherAmountThreshold, output.decimals)} {output.symbol}
              </dd>
              <dt>Route</dt>
              <dd>{quote.routePlan.map((r) => r.swapInfo.label).join(' → ')}</dd>
            </dl>
            <button className="primary" disabled={busy} onClick={swap}>
              {busy ? 'Swapping…' : `Confirm ${side}`}
            </button>
          </>
        ) : (
          <button className="primary" disabled={busy || !amount} onClick={review}>
            {busy ? 'Getting quote…' : 'Review'}
          </button>
        )}

        {error && <p className="error">{error}</p>}
        {txSignature && (
          <p>
            Done.{' '}
            <a href={`https://solscan.io/tx/${txSignature}`} target="_blank" rel="noreferrer">
              View on Solscan
            </a>
          </p>
        )}
      </section>
    </>
  )
}
