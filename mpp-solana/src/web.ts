import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createPayer } from './payment.js'

const resourceUrl = process.env.RESOURCE_URL ?? 'http://localhost:3010/api/protected'
const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const port = Number(process.env.WEB_PORT ?? 3020)

const payer = await createPayer()

type Challenge = {
  amount?: string
  currency?: string
  network?: string
  recipient?: string
}

async function getBalanceSol(address: string): Promise<number | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address, { commitment: 'confirmed' }],
      }),
    })
    const data = (await res.json()) as { result?: { value?: number } }
    const lamports = data.result?.value
    return typeof lamports === 'number' ? lamports / 1_000_000_000 : null
  } catch {
    return null
  }
}

// Read the unpaid 402 challenge so the page can show price + recipient.
async function getChallenge(): Promise<Challenge> {
  try {
    const res = await fetch(resourceUrl)
    const header = res.headers.get('www-authenticate') ?? ''
    const match = header.match(/request="([^"]+)"/)
    if (!match?.[1]) return {}
    const decoded = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8')) as {
      amount?: string
      currency?: string
      recipient?: string
      methodDetails?: { network?: string }
    }
    return {
      amount: decoded.amount,
      currency: decoded.currency,
      network: decoded.methodDetails?.network,
      recipient: decoded.recipient,
    }
  } catch {
    return {}
  }
}

const app = express()
app.use(express.static(join(dirname(fileURLToPath(import.meta.url)), '..', 'public')))

app.get('/api/state', async (_req, res) => {
  const challenge = await getChallenge()
  const [payerBalance, merchantBalance] = await Promise.all([
    getBalanceSol(payer.address),
    challenge.recipient ? getBalanceSol(challenge.recipient) : Promise.resolve(null),
  ])
  res.json({ resourceUrl, payer: payer.address, payerBalance, merchantBalance, challenge })
})

app.post('/api/pay', async (_req, res) => {
  try {
    const result = await payer.pay(resourceUrl)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

app.listen(port, () => {
  console.log(`MPP demo dashboard on http://localhost:${port}`)
  console.log(`Paying ${resourceUrl} from Openfort wallet ${payer.address}`)
})
