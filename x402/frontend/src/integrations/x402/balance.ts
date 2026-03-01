import type { Address } from 'viem'

import { ERC20_BALANCE_OF_ABI } from './contracts'
import { USDC_ADDRESSES } from './networks'

export type BalanceClient = {
  chain?: { id?: number | null } | null
  readContract: (args: {
    address: `0x${string}`
    abi: typeof ERC20_BALANCE_OF_ABI
    functionName: 'balanceOf'
    args: [Address]
  }) => Promise<bigint | string | number>
}

export async function getUSDCBalance(
  client: BalanceClient,
  owner: Address,
): Promise<bigint> {
  try {
    const chainId = client.chain?.id
    if (!chainId) {
      return 0n
    }

    const tokenAddress = resolveUsdcAddress(chainId)
    if (!tokenAddress) {
      return 0n
    }

    const balance = await client.readContract({
      address: tokenAddress,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [owner],
    })

    return toBigInt(balance)
  } catch (error) {
    console.error('Failed to fetch USDC balance', error)
    return 0n
  }
}

function resolveUsdcAddress(
  chainId: number | null | undefined,
): Address | undefined {
  if (!chainId) {
    return undefined
  }
  return USDC_ADDRESSES[chainId]
}

function toBigInt(balance: bigint | string | number): bigint {
  if (typeof balance === 'bigint') {
    return balance
  }
  if (typeof balance === 'number') {
    return BigInt(balance)
  }
  return BigInt(balance)
}
