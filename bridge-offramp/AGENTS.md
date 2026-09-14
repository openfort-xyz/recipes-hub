# AGENTS.md — bridge-offramp

## What this sample is

Next.js 15 App Router app: an Openfort embedded wallet cashes USDC out to a bank
account through Bridge (Stripe) liquidation addresses. Read `README.md` first —
its "Read this before you start" section explains which half of the flow Bridge's
sandbox can actually run, and why the drain timeline is simulated there.

## Setup commands

- `pnpm install`
- `cp .env.example .env.local` and fill it in. Bridge sandbox keys are not
  self-serve (email support@bridge.xyz); Openfort keys must all come from one
  project, with a fee-sponsorship policy on the chain in
  `NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID`.
- `pnpm dev` → http://localhost:3000

## Testing instructions

- `pnpm typecheck` · `pnpm lint` · `pnpm build` must all be clean.
- `pnpm check` formats and fixes with Biome (single quotes, no semicolons,
  2-space, 120 col).
- Unauthenticated smoke test: every `/api/*` route returns 401 without a bearer
  token.
- The full flow needs a Bridge sandbox key plus a signed-in Openfort user.

## Things that will bite you

- **Bridge has no testnet.** `chain` values are mainnet-only, so a sandbox
  cash-out address says `base` while the wallet runs on Base Sepolia. Don't
  "fix" this by inventing a testnet chain value.
- **`simulate_kyc_approval` needs a customer id**, which only exists once Bridge
  approves the KYC link. The sandbox button is hidden until then, on purpose.
- **Idempotency keys are derived from the Openfort user id**
  (`features/bridge/client.ts`). Don't switch them to random UUIDs — that turns a
  double-click into a second bank account.
- **Never take a customer id, wallet address or email from the request body.**
  `src/lib/auth.ts` resolves identity from the session token only. The cash-out
  address's return address is checked with `authorizeAddress()`.
- **`return_instructions: { address }`**, not `return_address` — the guide page
  and the API reference disagree; the reference is right.
- **Only the embedded-wallet connector is registered.** `getDefaultConfig` also
  registers Safe/Coinbase/injected connectors, and an external wallet fails the
  ownership check in step 3.
- **`next.config.ts` stubs are load-bearing.** `@openfort/react` 1.6.x reaches
  its Solana send path from the package entry, so `@solana/kit`,
  `@solana-program/{token,system}` and `@solana/kora` must stay aliased to
  `false` in an EVM-only app, alongside the wagmi 3 connector peers. Removing
  them fails the webpack build outright.

## PR instructions

- Title format: `[bridge-offramp] <summary>`.
- Document any environment variable change in both `README.md` and this file.
