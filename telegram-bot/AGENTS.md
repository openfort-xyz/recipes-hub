# AGENTS.md — telegram-bot

## Overview
- Telegram bot where each Telegram user gets an Openfort backend wallet (custodial, server-signed), keyed by Telegram user ID.
- Base Sepolia (84532), USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, gas sponsored via `OPENFORT_GAS_POLICY_ID`.
- No frontend. `src/commands.ts` holds pure handlers; `src/bot.ts` (grammY long-polling) and `src/demo.ts` (offline harness) both consume them.

## Setup commands
- `pnpm install`
- `cp .env.example .env` and fill `OPENFORT_SECRET_KEY`, `OPENFORT_WALLET_SECRET`, `OPENFORT_GAS_POLICY_ID`. `TELEGRAM_BOT_TOKEN` only needed for `pnpm start`.
- `pnpm demo` — runs /start → /balance → /send end-to-end with a fake Telegram user (no token needed). Funds the demo wallet from the treasury backend wallet if it holds ≥0.05 USDC.
- `pnpm start` — live bot via long polling.

## Testing instructions
- `pnpm type-check` and `pnpm lint` must pass.
- `pnpm demo` is the E2E check — it submits real sponsored transactions on Base Sepolia and prints explorer links.

## Gotchas
- Wallet secret is project-scoped: `OPENFORT_WALLET_SECRET` must belong to the same project as `OPENFORT_SECRET_KEY` or every signing call 401s.
- `openfort.accounts.evm.backend.get({ address })` requires the EIP-55 checksummed address, not lowercase.
- `sendTransaction` auto-upgrades the EOA to a 7702 delegated account on first use; the gas policy needs an `account_functions` "All functions" rule to actually sponsor.
- The wallet mapping lives in `data/wallets.json` (gitignored). Delete it to start fresh — old accounts remain in the Openfort project.
