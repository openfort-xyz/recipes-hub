# AGENTS.md

## Project overview
- Openfort + WalletConnect Pay integration with a Vite React frontend.
- An Openfort embedded wallet (managed via Shield) pays WalletConnect Pay merchant links.
- Uses passkey wallet recovery, so no backend is required.

## Setup commands
- `pnpm i`
- `cp .env.example .env`
- `pnpm dev` (serves UI on `http://localhost:5173`)

## Environment
- Frontend `.env` must define `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `VITE_WALLET_CONNECT_PROJECT_ID`, and `VITE_WALLETCONNECT_PAY_API_KEY`. `VITE_OPENFORT_FEE_SPONSORSHIP_ID` is optional.
- Recovery is passkey-based (`uiConfig.walletRecovery` in `src/Providers.tsx`); no encryption-session backend is needed. Switching to automatic recovery would require `createEncryptedSessionEndpoint`/`getEncryptionSession` in `walletConfig`.
- Missing frontend vars are surfaced in the UI (`src/utils/env.ts`) instead of failing inside the SDKs.

## Architecture
- `src/Providers.tsx` — wagmi config via `getDefaultConfig` + `OpenfortWagmiBridge` + `OpenfortProvider`.
- `src/lib/pay.ts` — shared `WalletConnectPay` client (`appId` = WalletConnect project id, `apiKey` = Pay key) and the `Eip1193Provider` shape forwarded to the Openfort wallet.
- `src/lib/chains.ts` — supported EVM mainnets, CAIP-10 account building, CAIP-2 parsing.
- `src/hooks/usePayment.ts` — the state machine: `getPaymentOptions` → optional data-collection iframe → `getRequiredPaymentActions` → sign each action via `provider.request` → `confirmPayment` (polled until `isFinal`).
- `src/components/*` — form, options list, compliance iframe, result view.

## How signing works
- WalletConnect Pay returns actions as `{ walletRpc: { chainId, method, params } }`.
- `method` is `eth_sendTransaction` / `eth_signTypedData_v4` / `personal_sign`; `params` is a JSON-encoded argument array.
- We `JSON.parse(params)` and call `provider.request({ method, params })` on the Openfort wallet's EIP-1193 provider (obtained from the wagmi connector), switching chains first when `walletRpc.chainId` differs from the active chain.

## Testing instructions
- `pnpm lint` / `pnpm check` (Biome lint, or lint+format with autofix)
- `pnpm build` (TypeScript compilation + Vite build)
- Runtime payment flow requires a live WalletConnect Pay API key and a real merchant payment link; it has not been executed end-to-end in this repo. Verify against a funded mainnet wallet before relying on it.

## Code style
- Vite + TypeScript, **Biome** for lint/format — single quotes, no semicolons, 2-space, 120 col.
- Functional React components and hooks; wallet state via wagmi and `@openfort/react` hooks.

## Dependencies
- Runs on `@openfort/react@^1.1.1` with **wagmi 3** and **viem 2** (`react@19`, `vite@8`). `@openfort/react` 1.1.1 requires wagmi 3.x.
- No dependency patches and no `pnpm-workspace.yaml` overrides. The earlier Vite pre-bundling failure — `@openfort/react@1.0.16` left `/* @vite-ignore */` lazy imports in `OpenfortProvider.js`, so Vite externalized them and the dev server 500'd with "Failed to resolve import ../../solana/SolanaContext.js" — is fixed upstream in 1.1.1. If you ever pin back to 1.0.16 you'd need that patch again.

## PR instructions
- Title format: `[walletconnect-pay] <summary>`.
- Run `pnpm lint` and `pnpm build` before requesting review.
- Document new env vars in `walletconnect-pay/README.md` when they change.
