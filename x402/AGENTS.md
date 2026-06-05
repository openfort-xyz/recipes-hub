# AGENTS.md

## Project overview
- React + Vite frontend and an Express.js 5 backend demonstrating Coinbase's x402 payment protocol with Openfort.
- Two payer types: **embedded wallets** (browser) and **backend wallets** (headless), both paying USDC over HTTP `402`.
- Gas is sponsored two ways (mutually exclusive): an Openfort policy/paymaster, or a Coinbase CDP facilitator. Runs on Base / Base Sepolia.

## Setup commands
- Backend: `cd backend && pnpm install && pnpm dev` (serves on `http://localhost:3007`)
- Frontend: `cd frontend && pnpm install && pnpm dev` (serves on `http://localhost:5173`)
- Copy env files first: `cp backend/.env.example backend/.env.local` and `cp frontend/.env.example frontend/.env.local`

## Environment
- Frontend (`VITE_`-prefixed): `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_POLICY_ID`, `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT`, `VITE_X402_RESOURCE_URL`, `VITE_X402_DEFAULT_AMOUNT`.
- Backend: `OPENFORT_SECRET_KEY`, the Shield keys, and **one** gas path — either CDP (`X402_FACILITATOR_URL`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`) or Openfort policy (`OPENFORT_WALLET_SECRET`, `OPENFORT_BACKEND_WALLET_ID`, `OPENFORT_DELEGATED_ACCOUNT_ID`, `OPENFORT_POLICY_ID`). Plus `PAY_TO_ADDRESS`, `X402_NETWORK`, and the `X402_ASSET_*` settings.
- Backend wallet flow: **Payer** = the backend wallet (fund it with USDC); **Recipient** = `PAY_TO_ADDRESS` (can be the payer itself). Restart the backend after changing `PAY_TO_ADDRESS`.

## Testing instructions
- Frontend: `pnpm check` (Biome) and `pnpm tsc -b`. Backend has no linter.
- Manually test both tabs (embedded + backend wallet) on `base-sepolia`: fund the payer, unlock `/api/protected-content`, and confirm the USDC transfer on the explorer.

## Code style
- Biome on the frontend (not Prettier); pnpm; TypeScript strict, no unjustified `any`.
- Keep `frontend/src/integrations/` pure (no UI imports); no hardcoded addresses/amounts/keys — read them from config (`backend/src/config.ts`, `frontend/src/integrations/x402/contracts.ts`).
- Server responses via `res.status().json()`; `@openfort/react` (client) and `@openfort/openfort-node` (server).

## PR instructions
- Title format: `[x402] <summary>`.
- Run `pnpm check` and `pnpm tsc -b` on the frontend before requesting review.
- Document env var changes in `x402/README.md`; test on both `base` and `base-sepolia`.
