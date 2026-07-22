import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface StoredWallet {
  accountId: string
  address: string
}

const STORE_PATH = join(process.cwd(), 'data', 'wallets.json')

function load(): Record<string, StoredWallet> {
  if (!existsSync(STORE_PATH)) return {}
  return JSON.parse(readFileSync(STORE_PATH, 'utf-8'))
}

export function getStoredWallet(telegramUserId: number): StoredWallet | undefined {
  return load()[String(telegramUserId)]
}

export function saveStoredWallet(telegramUserId: number, wallet: StoredWallet): void {
  const wallets = load()
  wallets[String(telegramUserId)] = wallet
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  writeFileSync(STORE_PATH, `${JSON.stringify(wallets, null, 2)}\n`, 'utf-8')
}
