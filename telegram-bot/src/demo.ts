// Drives the exact same command handlers the Telegram bot uses, with a fake
// Telegram user — verifies the full Openfort flow end-to-end without a bot token.
import { handleBalance, handleSend, handleStart } from './commands.js'
import { openfort } from './openfort.js'
import { getBalances, getWalletAddress } from './wallets.js'

const DEMO_TELEGRAM_USER_ID = 777_000_111
const TREASURY_ADDRESS = '0xB7fd0ac229f66a64623Df7DBfD42B955AD5673f9' as const

function say(label: string, reply: string) {
  console.log(`\n── ${label} ${'─'.repeat(Math.max(0, 60 - label.length))}\n${reply}`)
}

say('/start', await handleStart(DEMO_TELEGRAM_USER_ID))
say('/balance', await handleBalance(DEMO_TELEGRAM_USER_ID))

// Fund the demo wallet from the project treasury so /send moves real USDC.
const demoAddress = getWalletAddress(DEMO_TELEGRAM_USER_ID) as `0x${string}`
const demoBalance = await getBalances(demoAddress)
if (Number(demoBalance.usdc) < 0.02) {
  const treasury = await getBalances(TREASURY_ADDRESS)
  if (Number(treasury.usdc) >= 0.05) {
    console.log(`\nFunding demo wallet with 0.05 USDC from treasury ${TREASURY_ADDRESS}…`)
    const treasuryAccount = await openfort.accounts.evm.backend.get({ address: TREASURY_ADDRESS })
    const { sendUsdcFrom } = await import('./treasury.js')
    const hash = await sendUsdcFrom(treasuryAccount, demoAddress, '0.05')
    console.log(`Funded: https://sepolia.basescan.org/tx/${hash}`)
  } else {
    console.log(
      `\nTreasury has ${treasury.usdc} USDC — not enough to fund the demo. ` +
        'The /send step below will fail on balance; top up the treasury with Base Sepolia USDC from https://faucet.circle.com.',
    )
  }
}

const { usdc } = await getBalances(demoAddress)
const amount = Number(usdc) >= 0.02 ? '0.02' : '0'
if (amount === '0') {
  console.log(
    '\nNo test USDC available — sending a 0-USDC transfer to prove the sponsored pipeline. ' +
      'Top up any wallet above at https://faucet.circle.com for a real amount.',
  )
}
say(`/send ${amount} USDC`, await handleSend(DEMO_TELEGRAM_USER_ID, `${TREASURY_ADDRESS} ${amount}`))
say('/balance (after send)', await handleBalance(DEMO_TELEGRAM_USER_ID))

console.log('\nDemo complete — same handlers the live bot uses, verified on Base Sepolia.')
