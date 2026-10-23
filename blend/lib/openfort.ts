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

/** Load the treasury backend wallet (`TREASURY_WALLET_ID`). */
export function getTreasuryWallet() {
  if (!process.env.TREASURY_WALLET_ID) throw new Error('TREASURY_WALLET_ID not configured')
  return getOpenfortClient().accounts.evm.backend.get({ id: process.env.TREASURY_WALLET_ID })
}

/**
 * Send calls from the treasury wallet with gas paid by Openfort. The wallet is
 * EIP-7702-delegated on its first send and needs no ETH.
 *
 * @returns The on-chain transaction hash, once the transaction has succeeded.
 */
export async function sendSponsored(chainId: number, interactions: { to: string; data: string; value: string }[]) {
  if (!process.env.OPENFORT_FEE_SPONSORSHIP_ID) throw new Error('OPENFORT_FEE_SPONSORSHIP_ID not configured')
  const openfort = getOpenfortClient()
  const result = await openfort.accounts.evm.backend.sendTransaction({
    account: await getTreasuryWallet(),
    chainId,
    interactions,
    policy: process.env.OPENFORT_FEE_SPONSORSHIP_ID,
  })
  return waitForReceipt(result.id)
}

// sendTransaction resolves once the transaction exists, not once it has landed.
// The receipt (and its hash) is set when the status turns terminal.
async function waitForReceipt(transactionId: string, tries = 60): Promise<`0x${string}`> {
  for (let i = 0; i < tries; i++) {
    const tx = await getOpenfortClient().transactions.get(transactionId)
    if (tx.status === 'succeeded' && tx.receipt?.transactionHash) return tx.receipt.transactionHash as `0x${string}`
    if (tx.status === 'reverted' || tx.status === 'failed') {
      throw new Error(`Transaction ${transactionId} ${tx.status}: ${tx.receipt?.error?.reason ?? 'no reason given'}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Transaction ${transactionId} did not land after ${tries}s — check its status in the dashboard.`)
}
