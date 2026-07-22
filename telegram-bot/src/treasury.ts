import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'
import { CHAIN_ID, config, USDC_ADDRESS, USDC_DECIMALS } from './config.js'
import { openfort } from './openfort.js'

type BackendAccount = Awaited<ReturnType<typeof openfort.accounts.evm.backend.create>>

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
    policy: config.gasPolicyId,
  })
  const hash = result.response?.transactionHash
  if (!hash) {
    throw new Error(`Treasury transfer not submitted: ${JSON.stringify(result.response ?? result)}`)
  }
  return hash
}
