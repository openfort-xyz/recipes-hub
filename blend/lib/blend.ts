import {
  BlendServerSdk,
  createPaymasterResolver,
  getPimlicoPaymasterEndpoints,
  type SafeAccountResponse,
  SdkError,
  TransactionHandler,
} from '@blend-money/node'
import { erc20Abi } from 'viem'
import { base } from 'viem/chains'
import { getClients, getTreasuryAccount } from '@/lib/openfort'

// The treasury deposits native USDC on Base mainnet. Blend has no testnet.
export const DEPOSIT_CHAIN = base
export const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

let _blend: BlendServerSdk | null = null
let _handler: TransactionHandler | null = null

/**
 * Memoized Blend server SDK. The API key can act on any account in the
 * organization, so it stays server-side.
 */
export function getBlend(): BlendServerSdk {
  if (_blend) return _blend
  if (!process.env.BLEND_API_KEY || !process.env.BLEND_ACCOUNT_TYPE_ID) {
    throw new Error('Missing BLEND_API_KEY or BLEND_ACCOUNT_TYPE_ID environment variables')
  }
  _blend = new BlendServerSdk({ apiKey: process.env.BLEND_API_KEY, accountTypeId: process.env.BLEND_ACCOUNT_TYPE_ID })
  return _blend
}

/**
 * Blend's on-chain executor. Deposit plans are plain transactions from the
 * treasury EOA (approve + deposit); withdrawal plans are Safe UserOperations
 * signed by the EOA and sponsored through Pimlico.
 */
function getTransactionHandler(): TransactionHandler {
  if (_handler) return _handler
  if (!process.env.PIMLICO_API_KEY) throw new Error('Missing PIMLICO_API_KEY environment variable')
  _handler = new TransactionHandler(createPaymasterResolver(getPimlicoPaymasterEndpoints(process.env.PIMLICO_API_KEY)))
  return _handler
}

/** The treasury's Blend account (its Safe), or null if it has none yet. */
export async function findAccount(address: string): Promise<SafeAccountResponse | null> {
  try {
    return await getBlend().lookupAccount(address)
  } catch (error) {
    if (error instanceof SdkError && error.status === 404) return null
    throw error
  }
}

/** The treasury's Blend account, created (Safe on Base) on first use. */
export async function ensureAccount(address: string): Promise<SafeAccountResponse> {
  return (await findAccount(address)) ?? getBlend().createAccount(address, DEPOSIT_CHAIN.id)
}

/** Wallet balances, Blend position, returns and the account type's current yield. */
export async function getTreasuryStatus() {
  const { address } = await getTreasuryAccount()
  const { publicClient } = await getClients(DEPOSIT_CHAIN.id)
  const [usdc, eth, account, yieldData] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    publicClient.getBalance({ address }),
    findAccount(address),
    getBlend().discover.yield(),
  ])
  const client = account && getBlend().forAccount(account.accountId)
  const [balance, returns] = client ? await Promise.all([client.account.balance(), client.account.returns()]) : []
  return {
    address,
    wallet: { usdc: usdc.toString(), eth: eth.toString() },
    account,
    balance: balance ?? null,
    returns: returns ?? null,
    yield: yieldData.yieldBreakdown.map((y) => ({ chainId: y.chainId, apy: y.summary.theoreticalOverall })),
  }
}

/**
 * Quote a deposit of USDC from the treasury wallet, or a withdrawal back to it.
 * Quoting re-uses the account's one open session, so a new quote replaces the old one.
 */
export async function quote(params: { type: 'deposit' } | { type: 'withdraw'; max: boolean }, amount: string) {
  const { address } = await getTreasuryAccount()
  const account = await ensureAccount(address)
  const { sessions } = getBlend().forAccount(account.accountId)
  const { intentId } = await sessions.createSession()
  return params.type === 'deposit'
    ? sessions.quoteDeposit(intentId, { chainId: DEPOSIT_CHAIN.id, inputAssetAddress: USDC, eoa: address, amount })
    : sessions.quoteWithdraw(intentId, { destinationChainId: DEPOSIT_CHAIN.id, amount, isMaxWithdraw: params.max })
}

/**
 * Execute a quoted session to settlement: lock → sign and send each action plan
 * with the treasury wallet → submit the hashes → poll until SETTLED or FAILED.
 * Mirrors `BlendSdk.execute` from `@blend-money/fe`, with an Openfort backend wallet as the signer.
 */
export async function execute(intentId: string) {
  const { address } = await getTreasuryAccount()
  const account = await ensureAccount(address)
  return getBlend()
    .forAccount(account.accountId)
    .sessions.execute(intentId, {
      signerAddress: address,
      submitActionPlan: async (plan) => {
        const { walletClient, publicClient } = await getClients(plan.chainId)
        const { approvals, receipts } = await getTransactionHandler().submitActionPlan(
          walletClient,
          publicClient,
          account.safeAddress,
          [plan]
        )
        return [...approvals, ...receipts].map((r) => ({ hash: r.transactionHash, chainId: plan.chainId }))
      },
    })
}
