import { createWalletClient, http, parseUnits } from 'viem'
import { tempoModerato } from 'viem/chains'
import { Actions } from 'viem/tempo'
import { getNetworkConfig } from '@/lib/network'
import { createOpenfortTempoAccount } from '@/lib/openfort-account'

/**
 * Fund an agent wallet with PathUSD from the treasury.
 *
 * Tempo is not a chain Openfort indexes, so the treasury account is used purely
 * as a remote signer: viem builds and broadcasts a native Tempo token transfer
 * to the Tempo RPC, and `createOpenfortTempoAccount` signs it via Openfort. The
 * treasury must already hold PathUSD on Tempo (PathUSD is also the gas token).
 *
 * @param agentAddress - The agent wallet to credit.
 * @param amountUsd - Amount in USD (a small buffer is added to cover gas).
 * @returns The Tempo transaction hash.
 */
export async function fundAgentWallet(agentAddress: `0x${string}`, amountUsd: number): Promise<{ hash: string }> {
  const treasuryWalletId = process.env.TREASURY_WALLET_ID
  if (!treasuryWalletId) {
    throw new Error('TREASURY_WALLET_ID not configured')
  }

  const config = getNetworkConfig()
  const account = await createOpenfortTempoAccount(treasuryWalletId)

  const client = createWalletClient({
    account,
    chain: tempoModerato,
    transport: http(config.rpcUrl),
  })

  // Add a small buffer so the agent can also cover its own gas (paid in PathUSD).
  const gasBuffer = 0.01
  const amount = parseUnits((amountUsd + gasBuffer).toFixed(config.pathUsdDecimals), config.pathUsdDecimals)

  const hash = await Actions.token.transfer(client, {
    token: config.pathUsdContract,
    to: agentAddress,
    amount,
  })

  return { hash }
}
