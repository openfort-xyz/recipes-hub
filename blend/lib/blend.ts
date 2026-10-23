import { BlendServerSdk, type SafeAccountResponse, SdkError } from '@blend-money/node'
import { createPublicClient, erc20Abi, http } from 'viem'
import { base } from 'viem/chains'
import { getTreasuryWallet, sendSponsored } from '@/lib/openfort'
import { toInteractions } from '@/lib/safe'

// The treasury deposits native USDC on Base mainnet. Blend has no testnet.
export const DEPOSIT_CHAIN = base
export const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

let _blend: BlendServerSdk | null = null

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
  const { address } = await getTreasuryWallet()
  // shortcut: viem's default public Base RPC, rate-limited; pass your own RPC URL to http() in production.
  const publicClient = createPublicClient({ chain: DEPOSIT_CHAIN, transport: http() })
  const [usdc, account, yieldData] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    findAccount(address),
    getBlend().discover.yield(),
  ])
  const client = account && getBlend().forAccount(account.accountId)
  const [balance, returns] = client ? await Promise.all([client.account.balance(), client.account.returns()]) : []
  return {
    address,
    walletUsdc: usdc.toString(),
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
  const { address } = await getTreasuryWallet()
  const account = await ensureAccount(address)
  const { sessions } = getBlend().forAccount(account.accountId)
  const { intentId } = await sessions.createSession()
  return params.type === 'deposit'
    ? sessions.quoteDeposit(intentId, { chainId: DEPOSIT_CHAIN.id, inputAssetAddress: USDC, eoa: address, amount })
    : sessions.quoteWithdraw(intentId, { destinationChainId: DEPOSIT_CHAIN.id, amount, isMaxWithdraw: params.max })
}

/**
 * Execute a quoted session to settlement: lock → send each action plan from the
 * treasury wallet as an Openfort-sponsored transaction → submit the hashes → poll
 * until SETTLED or FAILED. Replaces `BlendSdk.execute`'s viem + bundler path.
 */
export async function execute(intentId: string) {
  const { address } = await getTreasuryWallet()
  const account = await ensureAccount(address)
  return getBlend()
    .forAccount(account.accountId)
    .sessions.execute(intentId, {
      signerAddress: address,
      submitActionPlan: async (plan) => [
        {
          hash: await sendSponsored(plan.chainId, toInteractions(plan, account.safeAddress, address)),
          chainId: plan.chainId,
        },
      ],
    })
}
