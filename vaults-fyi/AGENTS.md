# AGENTS.md

## Project overview
- Openfort embedded wallet + [vaults.fyi](https://vaults.fyi) API in a Vite React frontend.
- Discover the best USDC vaults, deposit, track positions, and claim rewards across 80+ protocols on Base.
- Deposit calldata targets canonical protocol contracts directly — no wrapper, no lock-in.
- Uses the external [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) for Shield authentication.

## Setup commands
- `pnpm install`
- `cp .env.example .env`
- `pnpm dev` (serves UI on `http://localhost:5173`)
- Backend: clone and run [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) on `http://localhost:3000`

## Environment
- `.env` needs `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `VITE_BACKEND_URL`, optional `VITE_OPENFORT_FEE_SPONSORSHIP_ID`, and `VAULTS_FYI_API_KEY`.
- `VAULTS_FYI_API_KEY` is **not** `VITE_`-prefixed: `vite.config.ts` reads it at startup and injects it as the `x-api-key` header via the dev proxy, so it never reaches the browser bundle. For production, add the same header from your own backend route.
- Get the vaults.fyi key from the [portal](https://portal.vaults.fyi) (issued within ~1 business day).

## Testing instructions
- `pnpm lint` (ESLint)
- `pnpm build` (TypeScript `tsc -b` + Vite build)
- Manually validate: sign in, fund USDC on Base, then deposit, redeem, and claim rewards.

## Code style
- Vite + TypeScript + React 19; functional components and hooks.
- Data via `@tanstack/react-query` hooks (`useDepositOptions`, `usePositions`, `useRewards`); on-chain writes via wagmi `useSendTransaction`.
- `useExecuteAction` signs the `actions` array sequentially, awaiting each receipt before the next.
- The `@vaultsfyi/sdk` client lives in `src/lib/vaultsFyi.ts`, configured to proxy through Vite.

## PR instructions
- Title format: `[vaults-fyi] <summary>`.
- Run `pnpm lint` and `pnpm build` before requesting review.
- Document new env vars or vaults.fyi endpoints in `vaults-fyi/README.md`.
