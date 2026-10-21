import Openfort from '@openfort/openfort-node'
import { type Chain, createPublicClient, createWalletClient, http } from 'viem'
import { toAccount } from 'viem/accounts'
import * as chains from 'viem/chains'

// Lazy initialization so importing this module never throws at build time.
let _openfort: Openfort | null = null

/**
 * Return a memoized Openfort server client.
 *
 * Reads `OPENFORT_SECRET_KEY` (project secret) and `OPENFORT_WALLET_SECRET`
 * (required for backend-wallet signing) from the environment.
 *
 * @throws If either environment variable is missing.
 */
export function getOpenfortClient(): Openfort {
  if (_openfort) return _openfort

  if (!process.env.OPENFORT_SECRET_KEY || !process.env.OPENFORT_WALLET_SECRET) {
    throw new Error('Missing OPENFORT_SECRET_KEY or OPENFORT_WALLET_SECRET environment variables')
  }

  _openfort = new Openfort(process.env.OPENFORT_SECRET_KEY, {
    walletSecret: process.env.OPENFORT_WALLET_SECRET,
  })

  return _openfort
}

/**
 * Load the treasury backend wallet (`TREASURY_WALLET_ID`) as a viem account.
 *
 * Openfort's EVM backend account already exposes viem-shaped `signMessage`,
 * `signTransaction` and `signTypedData`, so `toAccount` wraps it directly: viem
 * builds and broadcasts, Openfort only signs.
 */
export async function getTreasuryAccount() {
  if (!process.env.TREASURY_WALLET_ID) throw new Error('TREASURY_WALLET_ID not configured')
  const account = await getOpenfortClient().accounts.evm.backend.get({ id: process.env.TREASURY_WALLET_ID })
  return toAccount(account)
}

/**
 * viem clients for any chain Blend asks the treasury to sign on (deposits on the
 * origin chain, withdrawals on every chain the vault allocation spans).
 */
export async function getClients(chainId: number) {
  const chain = (Object.values(chains) as Chain[]).find((c) => c.id === chainId)
  if (!chain) throw new Error(`Unsupported chain ${chainId}`)
  // shortcut: viem's default public RPC per chain, rate-limited; pass your own RPC URL to http() in production.
  const transport = http()
  return {
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({ account: await getTreasuryAccount(), chain, transport }),
  }
}
