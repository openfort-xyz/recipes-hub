# AGENTS.md

## Project overview
- Expo React Native app showcasing Hyperliquid trading with Openfort embedded wallets.
- Cash App-style dark UI: hero balance numeral, pill buttons, custom keypad, full-screen step flows.
- Polls Hyperliquid testnet data and submits trades signed by the Openfort embedded wallet's EIP-1193 provider.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local`
- `pnpm dev` (launch Expo CLI with dev client and tunnel)
- `pnpm run ios` or `pnpm run android` after the dev server is running

## Environment
- `.env.local` requires `OPENFORT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_ENCRYPTION_KEY`, `OPENFORT_SHIELD_RECOVERY_BASE_URL`, and `OPENFORT_ETHEREUM_PROVIDER_POLICY_ID`.
- `HYPERLIQUID_WALLET_ADDRESS` is now **optional**. By default the embedded wallet trades and holds
  funds on its own Hyperliquid account (`activeWallet.address` doubles as the Hyperliquid account
  address). Only set this env var if you want the embedded wallet to act as a delegated "API wallet"
  trading on behalf of a different, pre-existing Hyperliquid account — in that case you must still
  register `activeWallet.address` as an API wallet for that account at
  `https://app.hyperliquid-testnet.xyz/API`. Note that the in-app "Move to Hyperliquid" deposit
  button always credits `activeWallet.address` (the sender), never an overridden
  `HYPERLIQUID_WALLET_ADDRESS` — the Bridge2 contract credits whoever sent the transfer.
- Confirm your Shield recovery endpoint is reachable from the target device prior to login.

## Hard-won upgrade notes (@nktkas/hyperliquid 0.24 → 0.33)
- **`actionSorter` was removed** from `@nktkas/hyperliquid/signing` somewhere between 0.24 and 0.33.
  `createL1ActionHash` hashes the action object in **insertion-key order**, so the replacement,
  `canonicalize(schema, value)`, must be used to reorder an action's keys to match Hyperliquid's wire
  schema before hashing/signing. For orders: `canonicalize(OrderRequest.entries.action, { type: "order", orders: [orderWire], grouping: "na" })`,
  where `OrderRequest` is imported from `@nktkas/hyperliquid/api/exchange`. The `OrderWire` object
  itself (`{ a, b, p, s, r, t }`) must still be built with keys in that exact order for the same reason.
- Info-endpoint response types were renamed: `Book` → `L2BookResponse`, `FrontendOrder[]` →
  `FrontendOpenOrdersResponse`. Both are still exported from the package root.
- Signing now goes exclusively through the embedded wallet's EIP-1193 provider
  (`activeWallet.getProvider()` → `provider.request({ method: "eth_signTypedData_v4", ... })`), not
  through a locally-exported private key. This matches Openfort's documented pattern and avoids
  handling raw keys client-side.
- `@openfort/react-native`'s `walletConfig` gas-sponsorship key is **`feeSponsorshipId`** (renamed
  from `ethereumProviderPolicyId` — same `OPENFORT_ETHEREUM_PROVIDER_POLICY_ID` value, new field name).
- Realign the `expo-*`/React Native version matrix with `pnpm expo install --fix` on every upgrade —
  several hand-picked "latest npm" versions turned out to be ahead of what the Expo SDK actually tests
  against (e.g. `react-native-webview` and `react-native-gesture-handler` both got walked back a major).
  Don't hand-bump those versions.

## Fixed: wrong USDC token address
The pre-upgrade `HYPERLIQUID_USDC_TOKEN_ADDRESS` constant pointed at Circle's real "USD Coin" proxy on
Arbitrum Sepolia (`0x75faf114...`). Hyperliquid's testnet Bridge2 contract (`0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89`)
does not accept that token — verified on-chain by reading Bridge2's actual deposit/withdrawal transfer
history, which exclusively moves a different token called **"USDC2"** (`0x1baAbB04529D43a73232B713C0FE471f7c7334d5`).
The constant now points at USDC2. If you fund the embedded wallet from an exchange or faucet, make sure
you're sending USDC2, not the Circle-issued token — sending the wrong token to the bridge does not get
credited and is unrecoverable (5 USDC minimum too, same rule).

## Funding
- `FundHyperliquidScreen` wires `useFunding` + `useFundingChains` from `@openfort/react-native` for the
  "Add money" path (deposit into the embedded wallet from another chain/wallet/exchange). In practice,
  Openfort's funding rail is a real bridging/swap service with mainnet liquidity — it is unlikely to
  offer a route into Arbitrum Sepolia testnet, so the screen shows a graceful empty state pointing at
  the Hyperliquid testnet faucet when `useFundingChains().chains` is empty or `isAvailable` is false.
- "Move to Hyperliquid" (`services/HyperliquidClient.ts#transfer`) is the real bridge deposit: a plain
  ERC-20 `transfer(HYPERLIQUID_BRIDGE_ADDRESS, amount)` of USDC2 via `wallet_sendCalls`, so it benefits
  from Openfort gas sponsorship the same way trades do.

## Testing instructions
- `pnpm lint` (eslint) and `pnpm typecheck` (tsc --noEmit) are wired as package scripts.
- Manually test: login, wallet provisioning, funding (both paths), and a sample buy/sell flow.
- Capture Metro logs for runtime warnings; resolve them before merge.
- `npx expo export --platform ios` prints a non-fatal Metro warning about `@noble/hashes/crypto.js`
  not being listed in that package's `exports` map (a deep import from an ethers/viem signing
  dependency, unrelated to app code). Metro falls back to file-based resolution and the bundle
  succeeds; unlike the `jose` fix already in `metro.config.js`, a `resolveRequest` redirect doesn't
  suppress it because Metro's built-in exports validator emits the warning before the custom resolver
  runs. Left as-is — flag if a future `@noble/hashes` release fixes its exports map upstream.

## Code style
- TypeScript strict-enabled; maintain Expo Router patterns already in `app/`.
- Data fetching uses custom `useState`/`useEffect`/`setInterval` polling hooks in `services/` and
  `hooks/` — intentionally, not a query library (`wagmi` and `@tanstack/react-query` were removed as
  unused dependencies during the SDK 57 upgrade).
- `typescript` is pinned to `~6.0.3` and `eslint` to `^9.x`, one major behind each tool's own "latest":
  TypeScript 7 is a from-scratch native rewrite that `typescript-eslint` doesn't support yet
  (`typescript: '>=4.8.4 <6.1.0'`), and ESLint 10 crashes `eslint-config-expo`'s bundled
  `eslint-plugin-react` (`contextOrFilename.getFilename is not a function`). Re-evaluate both pins next
  upgrade.
- `components/ui/` holds the shared design system (theme tokens, `PillButton`, `Keypad`, `Sparkline`,
  `SuccessCheck`, `Card`) for the Cash App-style dark UI.
- `@openfort/react-native` is pinned to `2.0.0`.

## PR instructions
- Title format: `[hyperliquid] <summary>`.
- Update `.env.example` and `README.md` if new configuration flags are required.
- Attach simulator/emulator notes or screenshots in PRs that modify onboarding or trading flows.
