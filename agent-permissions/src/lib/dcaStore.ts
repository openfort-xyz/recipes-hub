import { Redis } from '@upstash/redis'

export interface DcaPurchase {
  timestamp: string
  usdcSpent: string
  wethReceived: string
  price: string
  txHash?: string
}

export interface DcaConfig {
  amount: string
  frequency: number
  purchases: DcaPurchase[]
  lastPurchase: number
  agentAddress?: string
  agentId?: string
}

const PREFIX = 'dca:'
const AGENTS_SET = 'dca:agents'

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

// Async key-value store backed by Upstash Redis so data survives deploys.
// The source of truth for whether DCA is enabled is onchain (key registered + not expired).
export const dcaStore = {
  async get(key: string): Promise<DcaConfig | null> {
    return getRedis().get<DcaConfig>(`${PREFIX}${key}`)
  },
  async set(key: string, value: DcaConfig): Promise<void> {
    const redis = getRedis()
    await redis.set(`${PREFIX}${key}`, value)
    await redis.sadd(AGENTS_SET, key)
  },
  /** Returns all registered user addresses (lowercase). */
  async listAgents(): Promise<string[]> {
    return getRedis().smembers(AGENTS_SET)
  },
}
