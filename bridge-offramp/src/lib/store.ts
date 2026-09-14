// Which Bridge records belong to which Openfort user.
//
// A JSON file rather than a database: the whole point of the mapping is that
// you can open it and see it. Keyed by Openfort user id, which is the only
// identity this app trusts.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface StoredBankAccount {
  id: string
  currency: 'usd' | 'eur'
  bankName: string
  last4: string
}

export interface StoredCashOutAddress {
  id: string
  address: string
  chain: string
  rail: 'ach' | 'wire' | 'sepa'
  destinationCurrency: 'usd' | 'eur'
  externalAccountId: string
}

/**
 * A cash-out this app is pretending to settle, because Bridge's sandbox never
 * will. Only the start time is stored — the state is derived from elapsed time
 * in features/bridge/drains.ts, so there are no timers to keep alive.
 */
export interface SimulatedDrain {
  id: string
  amount: string
  txHash: string
  startedAt: number
  destinationCurrency: 'usd' | 'eur'
}

export interface CustomerRecord {
  openfortUserId: string
  bridgeCustomerId?: string
  kycLinkId?: string
  bankAccounts: StoredBankAccount[]
  cashOutAddresses: StoredCashOutAddress[]
  simulatedDrains: SimulatedDrain[]
}

type Store = Record<string, CustomerRecord>

const STORE_PATH = join(process.cwd(), 'data', 'customers.json')

async function readStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(STORE_PATH, 'utf8')) as Store
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw err
  }
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true })
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
}

const EMPTY = (userId: string): CustomerRecord => ({
  openfortUserId: userId,
  bankAccounts: [],
  cashOutAddresses: [],
  simulatedDrains: [],
})

export async function getRecord(userId: string): Promise<CustomerRecord> {
  const store = await readStore()
  return store[userId] ?? EMPTY(userId)
}

/**
 * Read-modify-write the one user's record.
 *
 * ponytail: last writer wins across concurrent requests for the same user —
 * fine for a single-user demo. Move to a real store if two devices sign in at
 * once and you care about losing one of the writes.
 */
export async function updateRecord(
  userId: string,
  mutate: (record: CustomerRecord) => CustomerRecord
): Promise<CustomerRecord> {
  const store = await readStore()
  const next = mutate(store[userId] ?? EMPTY(userId))
  store[userId] = next
  await writeStore(store)
  return next
}
