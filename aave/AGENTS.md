# AGENTS.md

## Project overview
- Openfort + Aave integration with a Vite React frontend.
- Uses Shield to manage embedded wallets and sponsored lending transactions.
- Requires external backend (openfort-backend-quickstart) for Shield authentication sessions.

## Setup commands
- `pnpm i`
- `cp .env.example .env`
- `pnpm dev` (serves UI on `http://localhost:5173`)
- Backend: Clone and run [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) on `http://localhost:3001`

## Environment
- Frontend `.env` must define `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_SHIELD_PUBLIC_KEY`, `VITE_OPENFORT_FEE_SPONSORSHIP_ID` (optional), and `VITE_BACKEND_URL`.
- Backend (external) `.env` must define `OPENFORT_SECRET_KEY` from Openfort dashboard.
- Populate both files with real Openfort credentials from the dashboard—placeholder values will fail.

## Testing instructions
- `pnpm lint` (TypeScript + ESLint checks)
- `pnpm build` (TypeScript compilation + Vite build)
- Verify frontend starts without runtime errors after updating environment values.

## Code style
- Follows Vite + TypeScript defaults with ESLint (`pnpm lint`).
- Prefer functional React components and hooks; wallet state is managed through wagmi and `@openfort/react` hooks.
- Uses `@aave/react`, `@aave/client`, and `@aave/graphql` SDKs for Aave protocol interactions.
- React Query (`@tanstack/react-query`) is a peer dependency used internally by wagmi and `@aave/react`; application code does not call React Query hooks directly.

## PR instructions
- Title format: `[aave] <summary>`.
- Run `pnpm lint` and `pnpm build` before requesting review.
- Document new env vars or contract addresses in `aave/README.md` when they change.
