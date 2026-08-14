# Openfort × Yield.xyz - MON Native Staking on Monad

[Yield.xyz](https://www.yield.xyz) is one API for 2,900+ yield opportunities across 80+ networks. This recipe combines an Openfort embedded wallet with Yield.xyz's StakeKit product to discover, enter, track, and exit **native MON staking on Monad Testnet** - entirely non-custodial.

Yield.xyz never signs or holds funds: every `enter`/`exit` call returns an ordered list of **unsigned** transactions, and this recipe signs and broadcasts each one with the user's own Openfort wallet.

You'll build a single-page app where users authenticate with Openfort, review validator commission and live APR from the Yield.xyz API, and stake, track, and exit their MON position through one unified interface.

## What this recipe demonstrates

`monad-testnet-mon-native-staking` - a free-faucet, single-step StakeKit flow: `DELEGATE` to enter, `UNDELEGATE` to exit, with validator selection.

## 1. Setup

```sh
cd openfort-yield-xyz
```

## 2. Setup backend

This recipe uses the same external backend as the other Openfort recipes for Shield authentication. Set up [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart):

```sh
git clone https://github.com/openfort-xyz/openfort-backend-quickstart.git
cd openfort-backend-quickstart
cp .env.example .env
# add OPENFORT_SECRET_KEY, SHIELD_PUBLISHABLE_KEY, SHIELD_SECRET_KEY, SHIELD_ENCRYPTION_KEY
# leave OPENFORT_BASE_PATH and SHIELD_BASE_PATH out of .env entirely rather than
# blank - the SDK's Shield base-path default only applies when the var is
# unset, not when it's an empty string, and an empty string breaks the fetch.
pnpm install
pnpm dev
```

The backend defaults to `http://localhost:3000` - if you're already running another Openfort recipe's backend there, set `PORT` in its `.env` and match `VITE_BACKEND_URL` below.

## 3. Get Openfort credentials

From your [Openfort dashboard](https://dashboard.openfort.io):

1. **Publishable Key**: Developers → API Keys
2. **Shield Publishable Key**: Developers → API Keys
3. **Fee Sponsorship ID** (optional): Policies → select or create a fee sponsorship policy for Monad Testnet

## 4. Get a Yield.xyz API key

Sign up via the [Yield.xyz dashboard](https://dashboard.yield.xyz), or contact `hello@yield.xyz`. Yield.xyz also publishes a **public, shared, rate-limited demo key** on their [products overview](https://stakekit.notion.site/Yield-xyz-Products-Overview-3135318e934e8042be5be2a6aa4c78bd) - `.env.example` defaults to it so you can try the recipe immediately, but it's shared by everyone trying this recipe, so get your own key before entering/exiting real positions or shipping anything.

Yield.xyz's plans (per their [rate-limits doc](https://docs.yield.xyz/docs/rate-limits-and-plans)): a self-serve **Trial** tier is free and includes "all integrations" at 1 request/sec; **Standard** goes to 100 req/sec; **Pro** (contact sales) goes higher. There's no plan-gated distinction between testnet and mainnet **network access** in the docs - this recipe's shared demo key already reads mainnet Monad data (`GET /v1/yields?network=monad`) successfully. What a paid plan buys you is throughput, not mainnet access. That said, get your own key and pick a tier that matches your expected request volume before going live - 1 req/sec on a shared key is not something to build a real product on.

No Yield.xyz sandbox/testnet API environment exists - the same API key and base URL (`api.yield.xyz`) serve both testnet and mainnet networks; which one you hit is determined entirely by the `network` field in the request (`monad-testnet` vs `monad`), not by the key or endpoint.

## 5. Configure environment

```sh
cp .env.example .env
```

Fill in:

```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_...
VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_...
VITE_OPENFORT_FEE_SPONSORSHIP_ID=pol_...           # optional
VITE_BACKEND_URL=http://localhost:3000
YIELD_XYZ_API_KEY=...
```

`YIELD_XYZ_API_KEY` is **not** prefixed with `VITE_`. It is read by `vite.config.ts` at server startup and injected into the dev proxy as the `X-API-KEY` header. The key never reaches the browser bundle. For production deploys, replace the dev proxy with your own backend route that adds the same header.

## 6. Run

```sh
pnpm install
pnpm dev
```

Open `http://localhost:5173`. Sign in with Openfort, fund the wallet with testnet MON from [testnet.monad.xyz](https://testnet.monad.xyz/), and enter the position.

## How the integration works

| Step | Endpoint | What you get |
|---|---|---|
| 1. Inspect | `GET /v1/yields/{yieldId}` | Full mechanics + the argument schema (amount, validator, min entry, warmup/cooldown) |
| 2. Validators | `GET /v1/yields/{yieldId}/validators` | Validator list with commission and APR |
| 3. Enter | `POST /v1/actions/enter` | An ordered `transactions[]` array, each with an `unsignedTransaction` ready to sign |
| 4. Sign & broadcast | - | This recipe switches the wallet to Monad Testnet if needed, signs each step via wagmi, waits for the receipt, then reports the hash back with `PUT /v1/transactions/{id}/submit-hash` |
| 5. Track | `GET /v1/yields/{yieldId}/balances?address=` | The user's current position |
| 6. Exit | `POST /v1/actions/exit` | Same shape as enter - same signer, same execution loop |

`unsignedTransaction` is a JSON-stringified plain transaction object (`to`, `data`, `value`, `chainId`, plus gas/nonce fields that this recipe deliberately ignores in favor of fresh estimation at send time - see `src/hooks/useExecuteAction.ts`). The wallet's active chain has to be switched to the target chain explicitly before signing - Openfort's embedded connector does not do this implicitly per-transaction.

For the full API reference, see [docs.yield.xyz](https://docs.yield.xyz/docs/getting-started).

## Going to mainnet

This recipe runs on Monad Testnet by default so you can test it for free. Moving to Monad mainnet is three edits - nothing else in the codebase is testnet-specific, since every component keys off the single `DEMO` config object.

**Prerequisites:**
- Your own Yield.xyz API key (see [step 4](#4-get-a-yield-xyz-api-key)) - the shared demo key works for mainnet reads too, but don't rely on it for anything real. No separate/paid plan is required specifically to *access* mainnet - see the plans note above - but size your plan to your real traffic.
- An Openfort fee-sponsorship policy scoped to Monad mainnet, if you're sponsoring gas (or a funded wallet that pays its own gas in real MON).
- Real MON to stake. There is no mainnet faucet.

**What changes, at a glance:**

| File | Setting | Testnet (default) | Mainnet |
| --- | --- | --- | --- |
| `src/config/demos.ts` | `network` | `monad-testnet` | `monad` |
| `src/config/demos.ts` | `chainId` | `10_143` | `143` |
| `src/config/demos.ts` | `yieldId` | `monad-testnet-mon-native-staking` | `monad-mon-native-staking` |
| `src/config/demos.ts` | `explorerUrl` | `https://testnet.monadexplorer.com` | `https://monadscan.com` |
| `src/config/demos.ts` | `faucetUrl` | `https://testnet.monad.xyz/` | `''` (none - no mainnet faucet) |
| `src/Providers.tsx` | `viem/chains` import | `monadTestnet` | `monad` |

**1. `src/config/demos.ts`** - swap the whole config:

```ts
export const DEMO: DemoConfig = {
  key: 'monad-staking',
  label: 'MON Native Staking',
  protocol: 'StakeKit',
  network: 'monad',                              // was 'monad-testnet'
  chainId: 143,                                  // was 10_143
  yieldId: 'monad-mon-native-staking',            // was 'monad-testnet-mon-native-staking'
  tokenSymbol: 'MON',
  tokenDecimals: 18,
  explorerUrl: 'https://monadscan.com',           // was https://testnet.monadexplorer.com
  faucetUrl: '',                                  // no mainnet faucet - remove the "need test funds?" link, or repurpose it
  requiresValidator: true,
  defaultAmount: '2',
}
```

**2. `src/Providers.tsx`** - swap the chain import and wagmi config:

```ts
import { monad } from 'viem/chains'   // was monadTestnet
// ...
const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [embeddedWalletConnector()],
  transports: { [monad.id]: http() },
})
```

**3. `.env`** - point `VITE_OPENFORT_FEE_SPONSORSHIP_ID` (if used) at a mainnet-scoped policy, and confirm your `YIELD_XYZ_API_KEY` has enough headroom for real traffic.

**What changes in practice:** mainnet has 209 registered validators for this yield (vs. testnet's 1) with real commission rates to compare, and a live floating APR (~14.8% at the time of writing - check current rates, this moves). The `unsignedTransaction` shape, the discover → enter → track → exit flow, and the chain-switch behavior are identical between testnet and mainnet - only the network parameters change.

## Known limitations

- **This recipe deliberately doesn't use Openfort's built-in wallet funding ("Add funds").** Confirmed directly in the running app: it returns "Funding isn't available on this network" on Monad Testnet. Whether it supports Monad mainnet wasn't verified - Openfort's docs don't publish an explicit supported-chain list, so check your dashboard or ask Openfort directly if you want to add it back for mainnet. Because of this, the app doesn't use Openfort's built-in `OpenfortButton` "Connected" panel at all once signed in (that panel hardcodes a Deposit button with no way to hide just that one action) - `src/components/WalletChip.tsx` is a small custom account chip (address, Send, Receive, sign out) instead. Fund wallets via the testnet faucet (or, on mainnet, a real transfer).

## Files

- `src/lib/yieldXyz.ts` - typed REST client, proxied through Vite so the API key stays server-side.
- `src/config/demos.ts` - the Monad staking config (network, chain id, yieldId, faucet).
- `src/hooks/useYieldQueries.ts` - React Query hooks: `useYieldDetail`, `useValidators`, `useBalances`.
- `src/hooks/useExecuteAction.ts` - switches chain if needed, then sequentially signs via wagmi's `useSendTransaction`, awaits each receipt, reports the hash back to Yield.xyz.
- `src/components/StakePanel.tsx` - yield details + enter form with validator picker.
- `src/components/PositionsPanel.tsx` - current position + exit.
- `src/components/WalletChip.tsx` - custom account chip (replaces Openfort's built-in "Connected" panel - see "Known limitations"): address with a Send/Receive dropdown, and an icon-only sign-out button.
- `src/components/SendPanel.tsx` - plain address-to-address MON transfer, opened from the Send option in `WalletChip`.
- `src/components/WalletBalance.tsx` - native MON balance; refetches automatically after any stake/exit/send via the `onSettled` callback threaded down from `App.tsx`.
- `vite.config.ts` - dev proxy that injects the Yield.xyz API key server-side.

## Deploying

**Push only the `openfort-yield-xyz/` folder** (i.e. everything in this directory). `.gitignore` already excludes `node_modules/`, `dist/`, `.env`, and `pnpm-lock.yaml` - nothing in here contains real credentials; `.env.example` and the docs only reference variable names.

`openfort-backend-quickstart/` is a separate, already-public repo - don't copy it into this one. Either point your deployment at your own clone of it (with its own `.env`, never committed), or fold its single `/api/protected-create-encryption-session` route into whatever backend you're already running. Either way, that backend's `.env` (holding `OPENFORT_SECRET_KEY` and the `SHIELD_*` keys) is a separate deploy from the frontend and must never ship in the frontend bundle.

Two things to change for a real deployment, beyond what's already covered above:
- **Environment variables**: set the real values (your dashboard keys, your own `YIELD_XYZ_API_KEY`, your deployed backend's URL) in your hosting provider's env var settings - not in a committed `.env`.
- **The Yield.xyz API key proxy**: `vite.config.ts`'s dev proxy only runs under `vite dev`. For a production build, replace it with a real backend route (in whatever backend you're already running) that adds the `X-API-KEY` header server-side, and point `src/lib/yieldXyz.ts`'s `BASE_PATH` at that route instead of `/api/yield-xyz`.

That covers hosting this app yourself. **Submitting it as a PR into `openfort-xyz/recipes-hub`** (so it shows up alongside the other recipes) is a different process - see `AGENTS.md`'s "Submitting this recipe to recipes-hub" section for the full step-by-step (forking, folder placement, version/theme conventions to reconcile, README table entries, and a from-clean re-verification checklist).

## Security

Yield.xyz is SOC 2 Type II and has undergone multiple smart-contract audits (Cantina, Zellic, Spearbit, Trail of Bits) and platform pentests - see their [trust center](https://trust.yield.xyz). Combined with Openfort's non-custodial embedded wallet, at no point does either party hold the user's funds or private key.

## Resources

- [Openfort docs](https://www.openfort.io/docs)
- [Yield.xyz docs](https://docs.yield.xyz/docs/getting-started)
- [Yield.xyz products overview](https://stakekit.notion.site/Yield-xyz-Products-Overview-3135318e934e8042be5be2a6aa4c78bd)
