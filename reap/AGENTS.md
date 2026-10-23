# AGENTS.md

## Project overview
- Openfort embedded wallet + Reap card issuing, Next.js 15 (App Router).
- The user signs in, passes KYC, and opens a **User-Funded** Reap account whose EVM signer is their Openfort wallet. Reap issues a virtual Visa card on that account.
- **Load**: the embedded wallet sends stablecoins to the account's own Reap deposit address on Polygon (gas sponsored). Reap credits the card balance once the deposit is approved.
- **Spend**: the card authorizes against that balance. In sandbox, a button simulates a purchase; card details open in Reap's hosted reveal iframe.
- Chain: Polygon Amoy with Reap's sandbox token RUSDC by default; Polygon mainnet USDC with a production key. Reap's User-Funded deposits are supported on Base, Polygon and Solana; this recipe uses Polygon.
- The Reap API key stays on the server. The route handlers in `src/app/api/` call Reap only after verifying the Openfort session.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local` and fill in the values
- `pnpm dev` starts on `http://localhost:3000`

## Environment
Every variable is listed in `.env.example` with a comment.

| Variable | Required | Read in |
| --- | --- | --- |
| `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY` | yes | `src/features/openfort/providers/openfort-provider-boundary.tsx`, `src/lib/auth.ts` |
| `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY` | yes | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `OPENFORT_SECRET_KEY` | yes | `src/lib/auth.ts` |
| `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID` | no | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID` | no, default `80002` | same |
| `REAP_API_KEY` | yes | `src/features/reap/client.ts` |
| `REAP_API_URL` | no, default `https://sg.sandbox.api.reap.global` | same (a `sandbox` URL enables the simulate buttons) |

## Testing instructions
- `pnpm verify` runs `biome lint .` and `next build` (type check included). It must finish with no errors and no warnings.
- **Not yet run against the Reap sandbox.** The requests follow the Reap API reference (`Reap-Version: 2025-02-14`) as of 2026-10-20, but no sandbox key was available when the recipe was written. Before relying on it, run the full flow once: details → simulated KYC → sign and open account → load RUSDC → reveal → simulated purchase, and record the date and result here.
- The flow needs a Reap project configured as **User-Funded** (Reap's default). A Program-Funded project provisions no deposit addresses, so the Load step reports `Reap has no deposit address for this account on chain 80002`.

## Add this to your app
For a coding agent adding a Reap card to an existing app that already has Openfort embedded wallets on an EVM chain.

**Dashboard setup**
1. [dashboard.openfort.io](https://dashboard.openfort.io): publishable, secret and Shield publishable keys from one project; optional fee sponsorship policy (`pol_...`) on Polygon Amoy (80002) or Polygon (137).
2. Reap: ask the Reap team for a sandbox API key on a **User-Funded** project, and for RUSDC on Polygon Amoy sent to your test wallet. Reap has no self-serve dashboard signup.

**Install** (exact versions this recipe runs)
```sh
pnpm add @openfort/react@2.1.3 @openfort/openfort-node@0.12.2 wagmi@^3.6.16 viem@^2.52.2 @tanstack/react-query@^5.101.0
```
Reap has no SDK dependency here: `src/features/reap/client.ts` is a `fetch` wrapper with a Bearer key and the `Reap-Version` header.

**Files that carry the integration**
| File | Role |
| --- | --- |
| `src/features/reap/client.ts` | Server-only Reap calls: users, KYC simulation, auth message, accounts, balance, cards, reveal, simulated purchase |
| `src/features/reap/cardholder.ts` | Resolves the Reap user, account and card from the Openfort user; issues the card once the account exists |
| `src/lib/auth.ts` | Verifies the Openfort session (`iam.getSession`) and wallet ownership (`accounts.list`) |
| `src/app/api/account/route.ts` | Hands out Reap's auth message and registers the wallet's signature as the account signer |
| `src/features/reap/use-reap.ts` | Client hook: signs the auth message, sends the deposit with wagmi `writeContract`, polls for KYC and deposit crediting |

**Steps**
1. Copy `client.ts`, `cardholder.ts` and `types.ts` into your server code, and set `REAP_API_KEY` / `REAP_API_URL`.
2. Use the Openfort embedded wallet as an `AccountTypeEnum.DELEGATED_ACCOUNT` (EIP-7702) so `signMessage` returns a plain ECDSA signature.
3. For each signed-in user, `findUser` by Openfort user id (`externalId`); if there is none, `createUser` with email, phone number (international format, unique per project) and legal name.
4. KYC: in sandbox, `simulateKycApproval` and poll `GET /users/{id}` until `application.status` is `APPROVED`. In production, run Reap's managed KYC (`POST /users/{id}/application` returns a provider SDK token).
5. `GET /accounts/auth-message`, have the wallet `signMessage` the returned `message` unchanged, then `createAccount` with `signers.evm = { address, message, signature }`. The message expires after 15 minutes.
6. `createCard` with `type: 'VIRTUAL'`.
7. Load: transfer RUSDC (sandbox) or USDC (production) on Polygon to the account's `chainAddresses` entry for `POLYGON_AMOY` / `POLYGON_MAINNET`. Poll `GET /accounts/{id}/balance` or subscribe to `CRYPTO_DEPOSIT_STATUS_UPDATED`; only `APPROVED` means spendable.
8. Show card details with `POST /cards/{id}/reveal` and load `revealUrl` in an iframe. Fetch a new URL each time.

**Check it works**: in sandbox, after a deposit is credited, `simulatePurchase` for less than the balance returns `status: PENDING`, and the balance drops by that amount.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`publishableKey`, `walletConfig`, `uiConfig`) | `src/features/openfort/providers/openfort-provider-boundary.tsx` | Publishable key | [React wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet) |
| `walletConfig.ethereum.accountType: DELEGATED_ACCOUNT` | same | none | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `walletConfig.shieldPublishableKey` | same | Shield publishable key | [API keys](https://www.openfort.io/docs/configuration/api-keys) |
| `walletConfig.ethereum.ethereumFeeSponsorshipId` | same | Fee sponsorship policy on the default chain | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `uiConfig.authProviders: [EMAIL_OTP]`, `walletRecovery.defaultMethod: PASSKEY` | same | Email OTP enabled | [UI configuration](https://www.openfort.io/docs/products/embedded-wallet/react/ui/configuration) |
| `OpenfortButton` | `src/features/reap/components/CardFlow.tsx` | none | [Openfort UI](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` | `src/features/openfort/config/wagmi-config.ts`, `src/app/providers.tsx` | none | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `useUser().getAccessToken` | `src/features/reap/use-reap.ts` | none | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser) |
| wagmi `useSignMessage`, `useWriteContract` on the embedded wallet | same | none | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `openfort.iam.getSession` | `src/lib/auth.ts` | Secret key | [Server-side auth](https://www.openfort.io/docs/products/server) |
| `openfort.accounts.list` | `src/lib/auth.ts` | Secret key | [Accounts](https://www.openfort.io/docs/products/server) |

## Failure modes
None observed yet: the recipe has not been run against the Reap sandbox (see Testing instructions). Reap errors surface in the UI as `<code>: <message>` from the API's `{ error: { code, message } }` body, so add rows here as they are seen.

## Reap notes
- Base URLs: `https://sg.sandbox.api.reap.global` and `https://sg.prod.api.reap.global` (Mexico: `mx.`). A key works in one environment only. Every request needs `Reap-Version: 2025-02-14`; every create call needs an `Idempotency-Key`.
- The funding model (User-Funded or Program-Funded) is fixed by Reap at project setup. This recipe is User-Funded: each user's account has its own deposit addresses and the user's wallet is the withdrawal signer. In a Program-Funded project you would instead hold funds yourself, top up a master collateral account, and set each user's spending power with Virtual Asset postings.
- User-Funded deposits land on Base, Polygon or Solana (Ethereum is master-collateral only). Polygon is the one EVM chain both funding models accept. Sandbox accepts only Reap's RUSDC/RUSDT: on Polygon Amoy RUSDC is `0x00D4e14024d8AbC6D6D35708b5bEC65B2f28e6E3` and RUSDT `0x0aAACf028519E30A88683222B00f4c7A8B5913CB`; production is Circle USDC `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359`. Reap reuses addresses across symbols on other testnets, so match on chain and address together.
- Deposits below 0.50 USD are rejected. There is no deposit simulation in sandbox: the transfer must be real.
- Withdrawals (`POST /crypto-withdrawals` → mint signing payload → wallet `signMessage` → submit signature) are not part of this recipe; the signer registered at account creation is the key they need.

## Code style
- Biome (single quotes, no semicolons, 2-space, 120 col). Run `pnpm check` to format.
- Reap calls live only in `src/features/reap/client.ts` and run server-side; the browser talks to `src/app/api/*`.

## PR instructions
- Title format: `[reap] <summary>`.
- `pnpm verify` must pass. For changes to the Reap client, run the flow against the sandbox and note the result under Testing instructions.
