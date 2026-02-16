import Openfort from '@openfort/openfort-node'
import { NextResponse } from 'next/server'
import { type Address, createWalletClient, erc20Abi, http, parseUnits } from 'viem'
import { toAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { AuthError, authorizeAddress } from '@/lib/auth'

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const
const AIRDROP_AMOUNT = parseUnits('1', 6) // 1 USDC

function getOpenfort() {
  const key = process.env.OPENFORT_SECRET_KEY
  if (!key) throw new Error('OPENFORT_SECRET_KEY is not configured')
  return new Openfort(key, {
    walletSecret: process.env.OPENFORT_WALLET_SECRET_KEY,
  })
}

export async function POST(req: Request) {
  let address: string
  try {
    const body = await req.json()
    address = body.address
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    await authorizeAddress(req, address)
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {

    const openfort = getOpenfort()

    // Get the backend wallet and wrap it as a viem LocalAccount
    const account = await openfort.accounts.evm.backend.get({
      id: process.env.OPENFORT_BACKEND_WALLET_ID!,
    })

    const viemAccount = toAccount({
      address: account.address,
      sign: async ({ hash }) => account.sign({ hash }),
      signMessage: async ({ message }) => account.signMessage({ message }),
      signTransaction: async (tx) => account.signTransaction(tx),
      signTypedData: async (typedData) => account.signTypedData(typedData),
    })

    const walletClient = createWalletClient({
      account: viemAccount,
      chain: baseSepolia,
      transport: http(),
    })

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [address as Address, AIRDROP_AMOUNT],
    })

    return NextResponse.json({ hash })
  } catch (err) {
    console.error('Airdrop error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
