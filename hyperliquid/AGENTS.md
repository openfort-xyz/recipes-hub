# AGENTS.md

## Project overview
- Expo React Native app showcasing Hyperliquid trading with Openfort embedded wallets.
- Polls Hyperliquid testnet data and submits trades through Shield-managed keys.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local`
- `pnpm start` (launch Expo CLI)
- `pnpm run ios` or `pnpm run android` after the dev server is running

## Environment
- `.env.local` requires `OPENFORT_PROJECT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_ENCRYPTION_KEY`, `OPENFORT_SHIELD_RECOVERY_BASE_URL`, `OPENFORT_ETHEREUM_PROVIDER_POLICY_ID`, and `HYPERLIQUID_WALLET_ADDRESS`.
- Confirm your Shield recovery endpoint is reachable from the target device prior to login.
- Keep Hyperliquid faucet balances refreshed so polling and trade previews succeed.

## Testing instructions
- `pnpm run lint` (Expo + TypeScript lint pass)
- Manually test: login, wallet provisioning, balance refresh, and a sample buy/sell flow in `MainAppScreen`.
- Capture Metro logs for runtime warnings; resolve them before merge.

## Code style
- TypeScript strict-enabled; maintain Expo Router patterns already in `app/`.
- Prefer hooks for shared logic (`useQuery` with React Query) and keep navigation state inside Expo Router conventions.

## PR instructions
- Title format: `[hyperliquid] <summary>`.
- Update `.env.example` and `README.md` if new configuration flags are required.
- Attach simulator/emulator notes or screenshots in PRs that modify onboarding or trading flows.
