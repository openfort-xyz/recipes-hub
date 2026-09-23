import { createPublicClient, encodeFunctionData, erc20Abi, formatEther, formatUnits, http, parseUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CHAIN_ID, config, USDC_ADDRESS, USDC_DECIMALS } from './config.js'
import { openfort } from './openfort.js'
import { getStoredWallet, saveStoredWallet } from './store.js'

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() })

type BackendAccount = Awaited<ReturnType<typeof openfort.accounts.evm.backend.create>>

export async function getOrCreateWallet(telegramUserId: number): Promise<BackendAccount> {
  const stored = getStoredWallet(telegramUserId)
  if (stored) return openfort.accounts.evm.backend.get({ id: stored.accountId })

  const account = await openfort.accounts.evm.backend.create()
  saveStoredWallet(telegramUserId, { accountId: account.id, address: account.address })
  return account
}

export function getWalletAddress(telegramUserId: number): string | undefined {
  return getStoredWallet(telegramUserId)?.address
}

export async function getBalances(address: `0x${string}`) {
  const [wei, usdcUnits] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }),
  ])
  return {
    eth: formatEther(wei),
    usdc: formatUnits(usdcUnits, USDC_DECIMALS),
    usdcUnits,
  }
}

export async function sendUsdc(telegramUserId: number, to: `0x${string}`, amount: string): Promise<string> {
  return sendUsdcFrom(await getOrCreateWallet(telegramUserId), to, amount)
}

export async function sendUsdcFrom(account: BackendAccount, to: `0x${string}`, amount: string): Promise<string> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, parseUnits(amount, USDC_DECIMALS)],
  })

  const result = await openfort.accounts.evm.backend.sendTransaction({
    account,
    chainId: CHAIN_ID,
    interactions: [{ to: USDC_ADDRESS, data }],
    policy: config.feeSponsorshipId,
  })

  return result.response?.transactionHash ?? waitForHash(result.id)
}

// sendTransaction resolves once the intent exists; the hash can arrive a few seconds later.
async function waitForHash(intentId: string, tries = 20): Promise<string> {
  for (let i = 0; i < tries; i++) {
    const intent = await openfort.transactionIntents.get(intentId)
    const hash = intent.response?.transactionHash
    if (hash) return hash
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Transaction ${intentId} produced no hash after ${tries}s — it may not have been broadcast.`)
}
