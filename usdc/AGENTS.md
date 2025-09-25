# AGENTS.md

## Project overview
- Expo React Native demo for Openfort embedded wallets moving USDC across Sepolia networks.
- Handles wallet creation, faucet funding, and sponsored transfers via Shield.

## Setup commands
- `npm install`
- `cp .env.example .env.local`
- `npm start` (Expo CLI)
- `npm run ios` or `npm run android` to launch on a device/emulator

## Environment
- `.env.local` must define `OPENFORT_PROJECT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_RECOVERY_BASE_URL`, and `OPENFORT_ETHEREUM_PROVIDER_POLICY_ID`.
- Make sure the Shield recovery service URL resolves from the target device so account restoration succeeds.
- Faucet links rely on Sepolia support; verify the provider policy covers the same chain IDs before testing transfers.

## Testing instructions
- No automated tests; manually verify login, faucet funding, sending USDC, and wallet switching.
- Watch Metro logs while testing and fix any warnings/errors observed during the flows above.

## Code style
- Stick to Expo Router conventions and functional React components with hooks.
- Keep Openfort state updates inside existing context/providers; avoid introducing new global singletons.

## PR instructions
- Title format: `[usdc] <summary>`.
- Update `README.md` if onboarding, faucet steps, or required env vars change.
- Confirm the Expo app launches from a clean `npm start` before opening a PR.
