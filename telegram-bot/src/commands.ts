import { isAddress } from 'viem'
import { EXPLORER_URL } from './config.js'
import { getBalances, getOrCreateWallet, getWalletAddress, sendUsdc } from './wallets.js'

export async function handleStart(telegramUserId: number): Promise<string> {
  const existing = getWalletAddress(telegramUserId)
  const account = await getOrCreateWallet(telegramUserId)
  const intro = existing
    ? 'Welcome back! Your wallet is ready.'
    : 'Wallet created! It lives on Base Sepolia and all gas is sponsored — you never need ETH.'
  return [
    intro,
    '',
    `Address: ${account.address}`,
    `${EXPLORER_URL}/address/${account.address}`,
    '',
    'Commands:',
    '/balance — check your ETH and USDC balance',
    '/send <address> <amount> — send USDC, gas-free',
  ].join('\n')
}

export async function handleBalance(telegramUserId: number): Promise<string> {
  const address = getWalletAddress(telegramUserId)
  if (!address) return 'No wallet yet — run /start first.'
  const { eth, usdc } = await getBalances(address as `0x${string}`)
  return `Balance for ${address}\n\nETH: ${eth}\nUSDC: ${usdc}`
}

export async function handleSend(telegramUserId: number, args: string): Promise<string> {
  const address = getWalletAddress(telegramUserId)
  if (!address) return 'No wallet yet — run /start first.'

  const [to, amount] = args.trim().split(/\s+/)
  if (!to || !amount || !isAddress(to) || Number.isNaN(Number(amount)) || Number(amount) < 0) {
    return 'Usage: /send <0x-address> <amount>\nExample: /send 0x1486…7ACB 0.5'
  }

  const { usdc } = await getBalances(address as `0x${string}`)
  if (Number(amount) > Number(usdc)) {
    return `Not enough USDC — you have ${usdc}, tried to send ${amount}.`
  }

  const hash = await sendUsdc(telegramUserId, to, amount)
  return `Sent ${amount} USDC to ${to}\n\n${EXPLORER_URL}/tx/${hash}`
}
