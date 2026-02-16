import Openfort, { createBackendWallet } from '@openfort/openfort-node'
import { NextResponse } from 'next/server'
import { type Address, createClient, http, publicActions } from 'viem'
import { baseSepolia } from 'viem/chains'
import { AuthError, authenticateRequest } from '@/lib/auth'
import { getCaliburKeySettings, getRegisteredKeys, KeyType } from '@/lib/calibur'
import { type DcaConfig, type DcaResponse, dcaStore, toResponse } from '@/lib/dcaStore'

const DCA_FREQUENCY_SECONDS = 60 // matches the Vercel cron interval

const DEFAULT_RESPONSE: DcaResponse = {
  enabled: false,
  amount: '0',
  purchases: [],
  lastPurchase: 0,
}

function getOpenfort() {
  const key = process.env.OPENFORT_SECRET_KEY
  if (!key) throw new Error('OPENFORT_SECRET_KEY is not configured')
  return new Openfort(key, {
    walletSecret: process.env.OPENFORT_WALLET_SECRET_KEY,
  })
}

function getViemClient() {
  return createClient({
    chain: baseSepolia,
    transport: http(),
  }).extend(publicActions)
}

export async function GET(req: Request) {
  try {
    await authenticateRequest(req)
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  }

  const cached = await dcaStore.get(address.toLowerCase())

  // Check onchain: look for a registered non-root Secp256k1 key that is not expired
  try {
    const client = getViemClient()
    const keys = await getRegisteredKeys(client, address as Address)

    const now = Math.floor(Date.now() / 1000)
    let agentAddress: string | undefined
    let enabled = false
    let expiresAt: number | null = null

    for (const { key, keyHash } of keys) {
      if (key.keyType !== KeyType.Secp256k1) continue
      const settings = await getCaliburKeySettings(client, address as Address, keyHash)
      if (settings.isAdmin) continue
      if (settings.expiration > 0 && settings.expiration <= now) continue

      // This is a non-admin, non-expired secp256k1 key — treat it as the DCA agent
      // Decode the address from the publicKey (it's abi.encode(address) = left-padded 32 bytes)
      agentAddress = `0x${key.publicKey.slice(26)}` as Address
      enabled = true
      if (settings.expiration > 0) {
        expiresAt = settings.expiration * 1000 // convert to ms for frontend
      }
      break
    }

    return NextResponse.json(toResponse(cached, { enabled, agentAddress, expiresAt }))
  } catch {
    // If onchain read fails (e.g. account not a Calibur account yet), fall back to cache
    return NextResponse.json(toResponse(cached))
  }
}

export async function POST(req: Request) {
  try {
    await authenticateRequest(req)
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const { address, amount, enabled } = body as Record<string, unknown>

    if (typeof address !== 'string' || address.length === 0) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }
    const parsedAmount = typeof amount === 'string' ? amount : undefined

    const key = address.toLowerCase()
    const existing = await dcaStore.get(key)

    if (enabled) {
      // Create a backend wallet via Openfort to act as the DCA agent
      getOpenfort() // ensure global API client is configured
      const agent = await createBackendWallet({
        chainType: 'EVM',
      })

      const config: DcaConfig = {
        amount: parsedAmount ?? existing?.amount ?? '0.1',
        frequency: DCA_FREQUENCY_SECONDS,
        purchases: existing?.purchases ?? [],
        lastPurchase: existing?.lastPurchase ?? 0,
        agentAddress: agent.address,
        agentId: agent.id,
      }
      await dcaStore.set(key, config)

      return NextResponse.json(toResponse(config, { enabled: true, agentAddress: agent.address }))
    }

    // Disable DCA — the actual revocation happens onchain via the client
    if (existing) {
      return NextResponse.json(toResponse(existing))
    }

    return NextResponse.json(DEFAULT_RESPONSE)
  } catch (err) {
    console.error('DCA error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
