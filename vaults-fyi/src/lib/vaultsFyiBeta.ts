// Client for vaults.fyi beta endpoints (borrow + fixed-term).
// Requests go through the Vite dev proxy which injects the API key.

const BASE = `${window.location.origin}/api/vaults-fyi`

async function betaGet<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v)
    }
  }
  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`vaults.fyi beta ${res.status} on ${path}${body ? `: ${body.slice(0, 200)}` : ''}`)
  }
  return res.json() as Promise<T>
}

// ---------- Borrow ----------

export type BorrowAssetData = {
  asset: {
    address: string
    assetCaip: string
    name: string
    symbol: string
    decimals: number
    assetLogo?: string
    assetPriceInUsd?: string
    assetGroup?: string
  }
  isCollateralEnabled: boolean
  supplyRate: number
  borrowRate: number
  utilizationRate: number
  totalSupplied: { usd: string; native: string }
  totalBorrowed: { usd: string; native: string }
  availableLiquidity: { usd: string; native: string }
  assetConfig: { isBorrowEnabled: boolean; borrowInterestFeeRate: number; borrowCap: string; supplyCap: string }
  defaultRiskParameters: { maxLtv: number; liquidationThreshold: number; liquidationPenalty: number }
}

export type BorrowMarket = {
  marketId: string
  name: string
  network: { name: string; chainId: number; networkCaip: string }
  protocol: { name: string; displayName: string; product?: string; version?: string }
  marketRootAddress: string
  assetsData: BorrowAssetData[]
}

export type Paginated<T> = { itemsOnPage: number; nextPage: number | null; data: T[] }

export type BorrowAction = 'supply' | 'withdraw' | 'borrow' | 'repay'

export type BorrowStep = { name: string; actions: string[]; actionsUrl: string }
export type BorrowContext = {
  marketId: string
  name: string
  currentSupplyStep: string
  supplySteps: BorrowStep[]
  currentWithdrawStep: string
  withdrawSteps: BorrowStep[]
  currentBorrowStep: string
  borrowSteps: BorrowStep[]
  currentRepayStep: string
  repaySteps: BorrowStep[]
}

export type ActionBundle = {
  currentActionIndex: number
  actions: { name: string; tx: { to: string; chainId: number; data?: string; value?: string } }[]
}

export function getBorrowMarkets(network: string, perPage = 50) {
  return betaGet<Paginated<BorrowMarket>>(`/beta/borrow/markets/${network}`, { perPage: String(perPage) })
}

export async function getAllBorrowMarkets(network = 'base'): Promise<BorrowMarket[]> {
  const all: BorrowMarket[] = []
  let page: number | undefined = undefined
  for (let guard = 0; guard < 30; guard++) {
    const res: Paginated<BorrowMarket> = await betaGet<Paginated<BorrowMarket>>(`/beta/borrow/markets/${network}`, {
      page: page !== undefined ? String(page) : undefined,
      perPage: '200',
    })
    all.push(...res.data)
    if (res.nextPage == null) break
    page = res.nextPage
  }
  return all
}

const EXPLORER_BY_CHAIN: Record<number, string> = {
  1: 'https://etherscan.io',
  10: 'https://optimistic.etherscan.io',
  56: 'https://bscscan.com',
  100: 'https://gnosisscan.io',
  130: 'https://uniscan.xyz',
  137: 'https://polygonscan.com',
  480: 'https://worldscan.org',
  8453: 'https://basescan.org',
  42161: 'https://arbiscan.io',
  42220: 'https://celoscan.io',
  43114: 'https://snowtrace.io',
  59144: 'https://lineascan.build',
}

export function explorerTxUrl(chainId: number, hash: string): string | null {
  const base = EXPLORER_BY_CHAIN[chainId]
  return base ? `${base}/tx/${hash}` : null
}

export function getBorrowContext(userAddress: string, network: string, marketId: string, assetAddress: string) {
  return betaGet<BorrowContext>(
    `/beta/borrow/markets/transactions/context/${userAddress}/${network}/${marketId}/${assetAddress}`
  )
}

export function getBorrowAction(
  action: BorrowAction,
  userAddress: string,
  network: string,
  marketId: string,
  assetAddress: string,
  opts: { amount?: string; all?: boolean }
) {
  return betaGet<ActionBundle>(
    `/beta/borrow/markets/transactions/${action}/${userAddress}/${network}/${marketId}/${assetAddress}`,
    { amount: opts.amount, all: opts.all ? 'true' : undefined }
  )
}

export function getBorrowPositions(userAddress: string) {
  return betaGet<unknown>(`/beta/borrow/portfolio/positions/${userAddress}`)
}

export type BorrowPositionAsset = {
  asset: { address: string; name: string; symbol: string; decimals: number; assetPriceInUsd?: string }
  collateralEnabled: boolean
  balanceNative: string
  balanceUsd?: string
  suppliedNative: string
  suppliedUsd?: string
  borrowedNative: string
  borrowedUsd?: string
}

export type BorrowMarketPosition = {
  marketId: string
  name: string
  network: { name: string; chainId: number }
  userAddress: string
  ltv?: number
  healthFactor?: number
  assets: BorrowPositionAsset[]
}

export function getBorrowMarketPosition(userAddress: string, network: string, marketId: string) {
  return betaGet<BorrowMarketPosition>(
    `/beta/borrow/portfolio/positions/${userAddress}/${network}/${marketId}`
  )
}

// ---------- Fixed-term (Pendle) ----------

export type FixedTermAction = 'swap-in' | 'swap-out'

export function getFixedTermMarket(network: string, vaultId: string) {
  return betaGet<unknown>(`/beta/fixed-term/detailed/${network}/${vaultId}`)
}

export function getFixedTermContext(userAddress: string, network: string, vaultId: string) {
  return betaGet<unknown>(`/beta/fixed-term/context/${userAddress}/${network}/${vaultId}`)
}

export function getFixedTermAction(
  action: FixedTermAction,
  userAddress: string,
  network: string,
  vaultId: string,
  opts: { assetAddress: string; amount: string; simulate?: boolean }
) {
  return betaGet<ActionBundle>(`/beta/fixed-term/transactions/${action}/${userAddress}/${network}/${vaultId}`, {
    assetAddress: opts.assetAddress,
    amount: opts.amount,
    simulate: opts.simulate ? 'true' : undefined,
  })
}
