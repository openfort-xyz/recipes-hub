/**
 * Minimal typed client for the Yield.xyz v1 REST API.
 *
 * Requests go through the Vite dev proxy (/api/yield-xyz), which adds the
 * X-API-KEY header server-side - see vite.config.ts. The key never reaches
 * the browser bundle.
 *
 * Docs: https://docs.yield.xyz/docs/getting-started
 */

export interface YieldToken {
  symbol: string
  name: string
  decimals: number
  network: string
  logoURI?: string
}

export interface YieldOpportunity {
  id: string
  network: string
  token: YieldToken
  rewardRate: { total: number; rateType: string }
  metadata: {
    name: string
    description: string
    logoURI?: string
    underMaintenance?: boolean
  }
  mechanics: {
    type: string
    requiresValidatorSelection: boolean
    rewardClaiming: string
    entryLimits: { minimum: string; maximum: string | null }
    warmupPeriod?: { seconds: number }
    cooldownPeriod?: { seconds: number }
  }
}

export interface YieldValidator {
  address: string
  name: string
  commission: number
  preferred: boolean
  status: string
  rewardRate?: { total: number; rateType: string }
}

export interface YieldTransaction {
  id: string
  title: string
  network: string
  status: string
  type: string
  hash: string | null
  stepIndex: number
  /** JSON-stringified unsigned transaction: { to, data, value, chainId, ... } */
  unsignedTransaction: string | null
}

export interface YieldAction {
  id: string
  intent: 'enter' | 'exit'
  status: string
  yieldId: string
  address: string
  amount: string
  transactions: YieldTransaction[]
}

export interface YieldBalance {
  type: string
  amount: string
  token: YieldToken
  validatorAddress?: string
  pricePerShare?: string
}

export interface YieldBalancesResponse {
  yieldId: string
  balances: YieldBalance[]
}

class YieldXyzError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'YieldXyzError'
    this.status = status
  }
}

const BASE_PATH = '/api/yield-xyz'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_PATH}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new YieldXyzError(res.status, body || res.statusText)
  }
  return res.json() as Promise<T>
}

export interface EnterExitArgs {
  yieldId: string
  address: string
  amount: string
  validatorAddress?: string
}

function toActionBody({ yieldId, address, amount, validatorAddress }: EnterExitArgs) {
  return {
    yieldId,
    address,
    arguments: {
      amount,
      ...(validatorAddress ? { validatorAddress } : {}),
    },
  }
}

export const yieldXyz = {
  listYields: (params: { network?: string; token?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params.network) qs.set('network', params.network)
    if (params.token) qs.set('token', params.token)
    qs.set('limit', String(params.limit ?? 20))
    return request<{ items: YieldOpportunity[]; total: number }>(`/yields?${qs.toString()}`)
  },

  getYield: (yieldId: string) => request<YieldOpportunity>(`/yields/${yieldId}`),

  getValidators: (yieldId: string) =>
    request<{ items: YieldValidator[]; total: number }>(`/yields/${yieldId}/validators`),

  getBalances: (yieldId: string, address: string) =>
    request<YieldBalancesResponse>(`/yields/${yieldId}/balances?address=${encodeURIComponent(address)}`),

  enter: (args: EnterExitArgs) =>
    request<YieldAction>('/actions/enter', { method: 'POST', body: JSON.stringify(toActionBody(args)) }),

  exit: (args: EnterExitArgs) =>
    request<YieldAction>('/actions/exit', { method: 'POST', body: JSON.stringify(toActionBody(args)) }),

  getAction: (actionId: string) => request<YieldAction>(`/actions/${actionId}`),

  submitHash: (transactionId: string, hash: string) =>
    request<YieldTransaction>(`/transactions/${transactionId}/submit-hash`, {
      method: 'PUT',
      body: JSON.stringify({ hash }),
    }),
}

export { YieldXyzError }
