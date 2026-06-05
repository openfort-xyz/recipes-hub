# AGENTS.md

## Project overview
- Next.js 15 app demonstrating Dollar-Cost Averaging (DCA) via delegated, time-limited permissions on Base Sepolia.
- A backend agent autonomously executes DCA swaps using Openfort embedded wallets + Calibur account abstraction (EIP-7702 + EIP-4337), gas-sponsored by an Openfort paymaster.
- Agent keys are non-admin and expire after 5 minutes (revocable); a Vercel cron runs the swaps.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local`
- `pnpm dev` (serves UI on `http://localhost:3000`)

## Environment
- Client: `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY`, `NEXT_PUBLIC_POLICY_ID`.
- Server: `OPENFORT_SECRET_KEY`, `OPENFORT_WALLET_SECRET_KEY`, `OPENFORT_BACKEND_WALLET_ID`, `CRON_SECRET`.
- Persistence: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Base Sepolia contracts: Calibur `0x000000009b1d0af20d8c6d0a44e162d11f9b8f00`, USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, Mock WETH `0xbabe0001489722187FbaF0689C47B2f5E97545C5`.

## Testing instructions
- `pnpm check` (Biome) or `pnpm lint`; `pnpm build`.
- Manually: authenticate (email OTP), create/recover a wallet, enable DCA, and confirm the cron route `/api/dca/execute` runs the swap.

## Code style
- Next.js 15 + TypeScript 5.8 with target `es5` — use `BigInt(0)`, not `0n`.
- Biome (single quotes, no semicolons, 2-space indent, 120 width); Tailwind v4 `@theme inline`.
- `@openfort/react` (client) + `@openfort/openfort-node` (server, lazy-init in API routes); viem 2.45.3 (pinned), wagmi, Upstash Redis.
- API routes authenticate via Bearer token using `authenticateRequest()` in `src/lib/auth.ts` (no middleware file).

## PR instructions
- Title format: `[agent-permissions] <summary>`.
- Run `pnpm check` and `pnpm build`; test the DCA flow end-to-end before requesting review.
- Document env var or contract changes in `agent-permissions/README.md` and this file.
