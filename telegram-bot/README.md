# Telegram wallet bot

A Telegram bot where every user gets their own on-chain wallet, created and operated server-side with [Openfort backend wallets](https://www.openfort.io/docs/products/server). Users chat commands; the bot signs and submits transactions on their behalf — no app install, no seed phrase, no gas.

- `/start` — creates a wallet for the Telegram user (mapped by their Telegram user ID)
- `/balance` — ETH + USDC balance on Base Sepolia
- `/send <address> <amount>` — sends USDC, gas sponsored by your project policy

## How it works

Each Telegram user ID maps to one Openfort backend wallet (`data/wallets.json` here; use your real database in production). Openfort holds the encrypted keys; your server authorizes every signature with the wallet secret. Gas is sponsored through a policy, so wallets work with zero ETH.

```
Telegram user ──/send──▶ bot (grammY) ──▶ Openfort backend wallet ──▶ Base Sepolia
                                  │
                          telegram_user_id → account_id
```

The command handlers in `src/commands.ts` are plain functions — `src/bot.ts` wires them to Telegram, `src/demo.ts` drives them directly so you can verify the whole flow without a bot token.

## Setup

1. `pnpm install`
2. `cp .env.example .env` and fill in:
   - `OPENFORT_SECRET_KEY` — dashboard → API keys
   - `OPENFORT_WALLET_SECRET` — dashboard → Backend wallets → Setup
   - `OPENFORT_GAS_POLICY_ID` — a Base Sepolia gas sponsorship policy
3. Try the flow without Telegram: `pnpm demo`
4. Go live: message [@BotFather](https://t.me/botfather), run `/newbot`, put the token in `TELEGRAM_BOT_TOKEN`, then `pnpm start` and message your bot.

To fund a wallet with test USDC, use [Circle's faucet](https://faucet.circle.com) (Base Sepolia).

## Production notes

- Swap `data/wallets.json` for your database — store only the account `id` and address, never keys.
- Add [signing policies](https://www.openfort.io/docs/configuration/policies) to cap what each wallet can do (contracts, methods, spend limits).
- If a user wants to leave with their key, backend wallets support [export](https://www.openfort.io/docs/products/server/accounts#exporting-accounts).
