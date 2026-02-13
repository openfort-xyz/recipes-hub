import Openfort, { createBackendWallet } from '@openfort/openfort-node'
import { NextResponse } from 'next/server'
import { type Address, createClient, http, publicActions } from 'viem'
import { baseSepolia } from 'viem/chains'
import {
  KeyType,
  getRegisteredKeys,
  getCaliburKeySettings,
} from '@/lib/calibur'
import { type DcaConfig, dcaStore } from '@/lib/dcaStore'

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

    for (const { key, keyHash } of keys) {
      if (key.keyType !== KeyType.Secp256k1) continue
      const settings = await getCaliburKeySettings(client, address as Address, keyHash)
      if (settings.isAdmin) continue
      if (settings.expiration > 0 && settings.expiration <= now) continue

      // This is a non-admin, non-expired secp256k1 key — treat it as the DCA agent
      // Decode the address from the publicKey (it's abi.encode(address) = left-padded 32 bytes)
      agentAddress = `0x${key.publicKey.slice(26)}` as Address
      enabled = true
      break
    }

    return NextResponse.json({
      enabled,
      amount: cached?.amount || '0',
      frequency: cached?.frequency || 30,
      purchases: cached?.purchases || [],
      agentAddress,
      lastPurchase: cached?.lastPurchase || 0,
    })
  } catch {
    // If onchain read fails (e.g. account not a Calibur account yet), fall back to cache
    return NextResponse.json({
      enabled: false,
      amount: cached?.amount || '0',
      frequency: cached?.frequency || 30,
      purchases: cached?.purchases || [],
      agentAddress: cached?.agentAddress,
      lastPurchase: cached?.lastPurchase || 0,
    })
  }
}

export async function POST(req: Request) {
  try {
    const { address, amount, frequency, enabled } = await req.json()

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    const key = address.toLowerCase()
    const existing = await dcaStore.get(key)

    if (enabled) {
      // Create a backend wallet via Openfort to act as the DCA agent
      getOpenfort() // ensure global API client is configured
      const agent = await createBackendWallet({
        chainType: 'EVM',
      })

      const config: DcaConfig = {
        amount: amount || existing?.amount || '1',
        frequency: frequency || existing?.frequency || 30,
        purchases: existing?.purchases || [],
        lastPurchase: existing?.lastPurchase || Date.now(),
        agentAddress: agent.address,
        agentId: agent.id,
      }
      await dcaStore.set(key, config)

      return NextResponse.json({
        enabled: true,
        amount: config.amount,
        frequency: config.frequency,
        purchases: config.purchases,
        agentAddress: agent.address,
        lastPurchase: config.lastPurchase,
      })
    }

    // Disable DCA — the actual revocation happens onchain via the client
    if (existing) {
      return NextResponse.json({
        enabled: false,
        amount: existing.amount,
        frequency: existing.frequency,
        purchases: existing.purchases,
        agentAddress: existing.agentAddress,
        lastPurchase: existing.lastPurchase || 0,
      })
    }

    return NextResponse.json({ enabled: false, amount: '0', frequency: 30, purchases: [], lastPurchase: 0 })
  } catch (err) {
    console.error('DCA error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
