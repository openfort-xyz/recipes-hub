# AGENTS.md

## Project overview
- Next.js 15 + TypeScript sample demonstrating EIP-7702 authorization with Openfort embedded wallets.
- Uses Permissionless + Pimlico for gasless (sponsored) transactions on Ethereum Sepolia.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local`
- `pnpm dev` (serves UI on `http://localhost:3000`)

## Environment
- `.env.local` needs the Openfort project keys (`NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY`, `OPENFORT_SECRET_KEY`, `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID`), the Shield keys (`NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_SECRET_KEY`, `OPENFORT_SHIELD_ENCRYPTION_SHARE`), `NEXT_PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT`, the Pimlico keys (`NEXT_PUBLIC_PIMLICO_API_KEY`, `NEXT_PUBLIC_SPONSORSHIP_POLICY_ID`), and `NEXT_PUBLIC_SEPOLIA_RPC_URL`.
- Populate with real Openfort credentials from the dashboard — placeholder values will fail.

## Testing instructions
- `pnpm check` (Biome format + lint + organize imports) or `pnpm lint`.
- `pnpm build` to verify the production build.
- Manually: sign in (email / Google / guest), run the EIP-7702 authorization, send a gasless transaction, and confirm it on Sepolia Etherscan.

## Code style
- Next.js 15 + React 19 + TypeScript; Biome (single quotes, ES5 trailing commas, 2-space indent).
- wagmi + viem for chain interactions, `@openfort/react` for embedded wallets, Permissionless for smart-account operations.
- Path alias `@/*` → `./src/*`; keep components functional with hooks.

## PR instructions
- Title format: `[7702] <summary>`.
- Run `pnpm check` and `pnpm build` before requesting review.
- Document env var changes in `7702/README.md` and this file.
