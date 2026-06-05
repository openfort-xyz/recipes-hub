import Openfort from '@openfort/openfort-node'

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

export interface AgentWallet {
  id: string
  address: `0x${string}`
  chainType: 'ethereum'
}

/**
 * Create a new EVM backend wallet for an agent.
 */
export async function createAgentWallet(): Promise<AgentWallet> {
  const account = await getOpenfortClient().accounts.evm.backend.create()

  return {
    id: account.id,
    address: account.address as `0x${string}`,
    chainType: 'ethereum',
  }
}

/**
 * Load an existing EVM backend wallet by its Openfort account id.
 */
export async function getWallet(accountId: string) {
  return getOpenfortClient().accounts.evm.backend.get({ id: accountId })
}
