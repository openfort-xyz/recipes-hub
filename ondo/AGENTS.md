# AGENTS.md

## Project overview
- Openfort + Ondo Global Markets: buy and sell tokenized stocks and ETFs (NVDAon, TSLAon, AAPLon, SPYon, QQQon) with USDC from an Openfort Solana embedded wallet.
- Trades are swaps routed by Jupiter's Swap API (`lite-api.jup.ag/swap/v1`) through on-chain pools holding Ondo tokens. The embedded wallet signs the transaction Jupiter builds; the app sends it to a Solana RPC.
- Chain: **Solana mainnet** (`mainnet-beta`). Ondo tokens are Token-2022 mints with 9 decimals. Real USDC and SOL (network fees, token account rent) are needed.
- No backend: wallets use passkey or password recovery, and Jupiter's keyless API is called from the browser.
- Compliance: Ondo Global Markets tokens are not available to U.S. persons or to anyone in a prohibited jurisdiction, and are limited to qualified/professional investors in several others ([eligibility](https://docs.ondo.finance/ondo-stocks/eligibility)). The app shows a notice and an eligibility attestation before the trade UI. A self-attestation is not KYC; production apps must enforce eligibility (KYC + geo-blocking) themselves.

## Setup commands
- `pnpm i`
- `cp .env.example .env` and fill in the keys.
- `pnpm dev` (serves on `http://localhost:5190`).

## Environment
- `VITE_OPENFORT_PUBLISHABLE_KEY` (required), `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY` (required).
- `VITE_SOLANA_RPC_URL` (optional; defaults to `https://api.mainnet-beta.solana.com`, which rate-limits browsers; use a provider RPC for anything real).

## Testing instructions
- `pnpm verify` = `biome lint .` + `node --test` (amount parsing/formatting and signature length checks in `src/ondo/*.test.ts`) + `tsc -b && vite build`.
- 2026-10-20: `pnpm install` and `pnpm verify` pass. Live Jupiter quotes returned routes for all five tokens (USDC → token, 1 USDC), and `/swap` returned a transaction that decodes with `@solana/kit` and lists the user as its only signer.
- **Not runtime-verified:** sign-in, wallet creation, signing the Jupiter transaction with the embedded wallet, sending and confirming a real swap. Manual check (needs live keys, SOL and USDC on mainnet): sign in, tick the attestation, buy 1 USDC of NVDAon, confirm the Solscan link resolves and the NVDAon balance updates, then sell it back.

## Add this to your app
For a coding agent adding Ondo tokenized stock trading to an existing React app with Openfort.

1. **Dashboard setup** ([dashboard.openfort.io](https://dashboard.openfort.io)): copy the publishable key and the Shield publishable key from Developers → API Keys. Enable the auth providers you use (this recipe: email OTP, Google).
2. **Install** (exact versions this recipe builds with):
   `pnpm add @openfort/react@2.1.3 @solana/kit@6.10.0 @tanstack/react-query@5.101.0`
   No wagmi or viem: the integration is Solana-only.
3. **Files that carry the integration** (copy and adapt):
   - `src/Providers.tsx`: `OpenfortProvider` with `walletConfig.chainType: ChainTypeEnum.SVM` and `walletConfig.solana: { cluster: 'mainnet-beta', rpcUrls }`, plus passkey/password recovery in `uiConfig.walletRecovery`.
   - `src/ondo/tokens.ts`: USDC and Ondo token mints and decimals.
   - `src/ondo/jupiter.ts`: `getQuote` (`GET /quote`, `slippageBps: 300`, `maxAccounts: 33`) and `getSwapTransaction` (`POST /swap`, returns a base64 transaction with the user as fee payer).
   - `src/ondo/send.ts`: `signAndSend` decodes the transaction, signs its message bytes with the embedded wallet provider, injects the 64-byte Ed25519 signature, sends it with `@solana/kit` and polls until `confirmed`.
   - `src/ondo/amounts.ts`: exact decimal ↔ base-unit conversion (no floats).
4. **Steps in order**: wrap the app in `Providers`; gate trading behind your eligibility check; get the wallet with `useSolanaEmbeddedWallet()` and wait for `status === 'connected'`; quote with `getQuote(USDC.mint, token.mint, units)` (swap the mints to sell); build with `getSwapTransaction(quote, provider.publicKey)`; call `signAndSend(provider, rpcUrl, tx)` right away (Jupiter's blockhash expires in about a minute); refresh balances with `useSolanaWalletAssets().refetch()`.
5. **Check it works**: `signAndSend` resolves with a signature that resolves on Solscan, and the token balance from `useSolanaWalletAssets` changes.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`walletConfig.chainType: SVM`, `walletConfig.solana`, `uiConfig.walletRecovery`) | `src/Providers.tsx` | Publishable key, Shield publishable key | [Solana wallets](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/solana) |
| Passkey / password recovery (`RecoveryMethod.PASSKEY`, `RecoveryMethod.PASSWORD`) | `src/Providers.tsx` | Shield publishable key; passkeys need a secure origin (localhost is fine) | [Recovery methods](https://www.openfort.io/docs/configuration/recovery-methods) |
| `OpenfortButton` | `src/App.tsx` | Auth providers enabled (email OTP, Google) | [UI components](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `useSolanaEmbeddedWallet` (`status`, `address`, `provider.signTransaction`, `provider.publicKey`) | `src/App.tsx`, `src/ondo/send.ts` | None | [useSolanaEmbeddedWallet](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useSolanaEmbeddedWallet) |
| `useSolanaWalletAssets` (SOL + SPL and Token-2022 balances, `refetch`) | `src/App.tsx` | None | [useSolanaWalletAssets](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useSolanaWalletAssets) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `Jupiter /quote?… failed (429)` | `lite-api.jup.ag` is keyless and rate-limited per IP. | Wait and retry. For production, call Jupiter's keyed API (`api.jup.ag`, key from portal.jup.ag) from your backend. |

## Recipe notes
- Why Solana and Jupiter: Ondo tokens are also on Ethereum and BNB Chain, but primary mint/redeem through Ondo needs Ondo KYC (institutional-only today). On Solana, the tokens trade permissionlessly against USDC in pools Jupiter aggregates, so an embedded wallet can trade them with no partner API.
- Network fees are paid in SOL by the wallet. `walletConfig.solana.sponsorFees` only covers sends that go through Openfort's own send flow, not an externally built transaction like Jupiter's.
- The first buy of each token creates its Token-2022 account (~0.002 SOL rent), so keep a little SOL in the wallet.
- Openfort's Solana signer can return a 65-byte signature (trailing recovery byte); Solana needs 64. `toEd25519Signature` trims it, matching what `@openfort/react` does in its own transfer flow.
- To list more tokens, take mints from [jup.ag/tokens/ondo](https://jup.ag/tokens/ondo) and check the token is Jupiter-verified (`tags` include `ondo` and `verified`); look-alike tokens use similar symbols.

## Code style
- Vite + TypeScript, Biome (`pnpm lint`, `pnpm check`): single quotes, no semicolons, 2-space, 100 col.
- Functional components; plain CSS tokens in `src/index.css` (Geist, neutral palette, light + dark via `prefers-color-scheme`).

## PR instructions
- Title format: `[ondo] <summary>`.
- Run `pnpm verify` before requesting review; document env changes in `README.md`, `.env.example` and this file.
