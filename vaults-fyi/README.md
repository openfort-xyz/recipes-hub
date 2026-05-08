# Openfort × vaults.fyi

[vaults.fyi](https://vaults.fyi) is one API for DeFi yield: discovery, ready-to-sign transaction payloads, and position tracking across 80+ protocols and 1,000+ yield strategies. This recipe shows how to combine an Openfort embedded wallet with the vaults.fyi API to discover the best USDC vaults for the user's wallet, deposit directly into any of them, track positions across every protocol, and claim rewards.

The deposit calldata vaults.fyi returns targets the canonical protocol contract directly. There is no wrapper contract, no idle cash buffer, and no required user-facing fee. The position the user holds is identical to one they would hold by interacting with Morpho, Sky, or Aave from any other wallet.

## What this recipe demonstrates

- **One API for every protocol.** Switch from a Morpho vault to a Sky vault to an Aave market by changing a `vaultId`. No new ABIs, no new connectors, no new code.
- **No wrapper, no lock-in.** If you stop using vaults.fyi, your users still hold real positions in the canonical vaults that any wallet can manage.
- **Portfolio reads everything.** The positions endpoint returns every vault position the user holds across every supported protocol, including ones opened outside this app.
- **Two-step rewards flow.** `rewards/context` returns claim ids for any reward the user can claim across protocols; `rewards/claim` returns the per-network transactions to execute.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/vaults-fyi openfort-vaultsfyi && cd openfort-vaultsfyi
```

## 2. Setup backend

This recipe uses the same external backend as the other Openfort recipes for Shield authentication. Set up [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart):

```bash
git clone https://github.com/openfort-xyz/openfort-backend-quickstart.git
cd openfort-backend-quickstart
cp .env.example .env
# add OPENFORT_API_KEY and OPENFORT_SHIELD_SECRET_KEY
pnpm install
pnpm dev
```

The backend runs on `http://localhost:3000`.

## 3. Get Openfort credentials

From your [Openfort dashboard](https://dashboard.openfort.io):

1. **Publishable Key**: Developers → API Keys
2. **Shield Public Key**: Developers → API Keys
3. **Fee Sponsorship ID** (optional): Policies → select or create a fee sponsorship policy

## 4. Get a vaults.fyi API key

Sign up at the [vaults.fyi portal](https://portal.vaults.fyi) to get an API key. Keys are typically issued within one business day. See the [SDK quickstart](https://docs.vaults.fyi/sdk/quickstart) for more details.

## 5. Get WalletConnect Project ID

Create a project at [WalletConnect Cloud](https://cloud.walletconnect.com/) and copy the Project ID.

## 6. Configure environment

```bash
cp .env.example .env
```

Fill in:

```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_...
VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_...
VITE_OPENFORT_FEE_SPONSORSHIP_ID=pol_...           # optional
VITE_WALLET_CONNECT_PROJECT_ID=...
VITE_BACKEND_URL=http://localhost:3000
VAULTS_FYI_API_KEY=...
```

`VAULTS_FYI_API_KEY` is **not** prefixed with `VITE_`. It is read by `vite.config.ts` at server startup and injected into the dev proxy as the `x-api-key` header. The key never reaches the browser bundle. For production deploys, replace the dev proxy with your own backend route that adds the same header.

## 7. Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`. Sign in with Openfort, fund the wallet with USDC on Base, and the recommended vaults will appear automatically.

## How the integration works

| Step | Endpoint | What you get |
|---|---|---|
| 1. Discover | `GET /v2/portfolio/best-deposit-options/:userAddress` | Top vaults across every protocol, ranked by APY, filtered by the assets the user actually holds |
| 2. Deposit | `GET /v2/transactions/deposit/:user/:network/:vaultId` | An ordered `actions` array, each with `tx.to`, `tx.data`, `tx.chainId`, `tx.value` ready to sign |
| 3. Track | `GET /v2/portfolio/positions/:userAddress` | Every vault position the user holds across every protocol, including ones opened elsewhere |
| 4. Redeem | `GET /v2/transactions/redeem/:user/:network/:vaultId?all=true` | Same shape as deposit |
| 5. Claim | `GET /v2/transactions/rewards/context/:userAddress` then `/rewards/claim` | Two-step: discover claim ids, then per-network transactions |

For the full API reference, see [docs.vaults.fyi](https://docs.vaults.fyi) and the OpenAPI spec at `https://api.vaults.fyi/v2/documentation/`.

## Files

- `src/lib/vaultsFyi.ts` — `@vaultsfyi/sdk` client instance, configured to proxy through Vite so the API key stays server-side.
- `src/hooks/useDepositOptions.ts`, `usePositions.ts`, `useRewards.ts` — React Query hooks.
- `src/hooks/useExecuteAction.ts` — sequential signer using wagmi's `useSendTransaction`, awaits each receipt before proceeding.
- `src/components/DiscoverPanel.tsx`, `ActionPanel.tsx`, `PositionsPanel.tsx`, `RewardsPanel.tsx` — UI for each flow.
- `vite.config.ts` — dev proxy that injects the vaults.fyi API key server-side.

## Resources

- [Openfort docs](https://www.openfort.io/docs)
- [vaults.fyi docs](https://docs.vaults.fyi)
- [Cookbook recipe on docs.openfort.io](https://www.openfort.io/docs/recipes/yield-on-vaultsfyi)
