// Jupiter's keyless Swap API. Ondo tokens trade against USDC in on-chain pools Jupiter routes through.
const JUPITER_API = 'https://lite-api.jup.ag/swap/v1'

export type Quote = {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  priceImpactPct: string
  routePlan: { swapInfo: { label: string } }[]
}

async function jupiter<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${JUPITER_API}${path}`, init)
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? `Jupiter ${path} failed (${res.status})`)
  return body as T
}

export function getQuote(inputMint: string, outputMint: string, amount: bigint) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: '300',
    // Keeps multi-hop routes through Ondo pools inside Solana's per-transaction account limit.
    maxAccounts: '33',
  })
  return jupiter<Quote>(`/quote?${params}`)
}

/** Returns the unsigned swap transaction, base64-encoded, with the user as fee payer. */
export async function getSwapTransaction(quote: Quote, userPublicKey: string) {
  const { swapTransaction } = await jupiter<{ swapTransaction: string }>('/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey, dynamicComputeUnitLimit: true }),
  })
  return swapTransaction
}
