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
  const account = await getOrCreateWallet(telegramUserId)
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, parseUnits(amount, USDC_DECIMALS)],
  })

  const result = await openfort.accounts.evm.backend.sendTransaction({
    account,
    chainId: CHAIN_ID,
    interactions: [{ to: USDC_ADDRESS, data }],
    policy: config.gasPolicyId,
  })

  const hash = result.response?.transactionHash
  if (!hash) {
    throw new Error(`Transaction was not submitted: ${JSON.stringify(result.response ?? result)}`)
  }
  return hash
}
