# AGENTS.md

## Project overview
- Expo React Native app (Expo 57 / RN 0.86) showcasing Hyperliquid trading with Openfort embedded wallets.
- Cash App-style dark UI: hero balance numeral, pill buttons, custom keypad, full-screen step flows.
- Testnet only: the wallet lives on **Arbitrum Sepolia**, trades go to **Hyperliquid testnet**. Orders are
  signed by the Openfort embedded wallet's EIP-1193 provider; the USDC bridge deposit is a sponsored
  `wallet_sendCalls`.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local`
- `pnpm dev` (launch Expo CLI with dev client and tunnel)
- `pnpm run ios` or `pnpm run android` after the dev server is running

## Environment
- `.env.example` lists every variable. `app.config.js` copies them into `expo.extra`, read at runtime
  through `utils/config.ts`; `utils/envValidation.ts` blocks the app with an error screen when a required one
  is missing.
- Required: `OPENFORT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_RECOVERY_BASE_URL`
  (must be HTTPS).
- Optional: `OPENFORT_FEE_SPONSORSHIP_ID` (without it the wallet pays its own gas and a console warning is
  logged).
- `HYPERLIQUID_WALLET_ADDRESS` is **optional**. By default the embedded wallet trades and holds
  funds on its own Hyperliquid account (`activeWallet.address` doubles as the Hyperliquid account
  address). Only set this env var if you want the embedded wallet to act as a delegated "API wallet"
  trading on behalf of a different, pre-existing Hyperliquid account — in that case you must still
  register `activeWallet.address` as an API wallet for that account at
  `https://app.hyperliquid-testnet.xyz/API`. Note that the in-app "Move to Hyperliquid" deposit
  button always credits `activeWallet.address` (the sender), never an overridden
  `HYPERLIQUID_WALLET_ADDRESS` — the Bridge2 contract credits whoever sent the transfer.
- The Shield encryption share is a backend secret: it belongs in the recovery backend
  ([openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart)), not in this app.
- Confirm your Shield recovery endpoint is reachable from the target device prior to login.

## Testing instructions
- `pnpm verify` runs `eslint .` and `tsc --noEmit`. That is what CI checks; it does not build or run the app.
- Manually test on a simulator/device with real keys: login (guest, Google, Apple), wallet provisioning
  with automatic recovery, funding (both paths), and a sample buy/sell flow. Native builds and these flows
  were not re-run for the `@openfort/react-native` 2.1.2 upgrade (2026-09-23); only `pnpm verify` was.
- Capture Metro logs for runtime warnings; resolve them before merge.
- `npx expo export --platform ios` prints a non-fatal Metro warning about `@noble/hashes/crypto.js`
  not being listed in that package's `exports` map (a deep import from an ethers/viem signing
  dependency, unrelated to app code). Metro falls back to file-based resolution and the bundle
  succeeds; unlike the `jose` fix already in `metro.config.js`, a `resolveRequest` redirect doesn't
  suppress it because Metro's built-in exports validator emits the warning before the custom resolver
  runs. Left as-is — flag if a future `@noble/hashes` release fixes its exports map upstream.

## Add this to your app
For a coding agent adding Openfort-signed Hyperliquid trading to an existing Expo app.

**Dashboard setup** ([dashboard.openfort.io](https://dashboard.openfort.io))
1. Copy the publishable key and the Shield publishable key (Project Settings > API Keys).
2. Configure the Google and Apple providers you use (Configuration > Social login).
3. Create a fee sponsorship policy for Arbitrum Sepolia (421614) covering the USDC2 token contract
   `0x1baAbB04529D43a73232B713C0FE471f7c7334d5`; copy its `pol_...` ID.
4. Deploy a recovery backend exposing `POST /api/protected-create-encryption-session` (it holds the Shield
   secret key and encryption share), for example openfort-backend-quickstart.
5. Optional: enable Funding if you want the `useFunding` deposit path (it rarely routes to testnets).

**Install**
```bash
npx expo install @openfort/react-native@2.1.2 expo-secure-store expo-crypto expo-application expo-apple-authentication react-native-webview react-native-get-random-values
npm install @nktkas/hyperliquid@^0.33.1 viem@^2.55.0 ethers@^6.17.0 event-target-polyfill@^0.0.4
```
Add `expo-secure-store` to `plugins` in `app.json`. This uses native modules, so it needs a dev client
(`expo run:ios` / `expo run:android`), not Expo Go.

**Files that carry the integration**
| File | Role |
| --- | --- |
| `app/_layout.tsx` | `OpenfortProvider` with `walletConfig` (`shieldPublishableKey`, `feeSponsorshipId`, `getEncryptionSession`) and `supportedChains` |
| `constants/network.ts` | Arbitrum Sepolia chain object for `supportedChains`, plus hex/CAIP-2 chain IDs |
| `services/walletRecovery.ts` | `getEncryptionSession` callback: POSTs to your recovery backend and returns `session` |
| `services/HyperliquidClient.ts` | Order signing (`eth_signTypedData_v4` over the Hyperliquid L1 action hash) and the Bridge2 USDC deposit (`wallet_sendCalls`) |
| `components/onboarding/FundHyperliquidScreen.tsx` | Optional `useFunding` / `useFundingChains` deposit flow |

**Steps**
1. Load the polyfills first: copy `entrypoint.ts` (`react-native-get-random-values`, `./polyfills`, then `expo-router/entry`; set it as `main` in `package.json`) and
   `polyfills.ts` (EventTarget/CustomEvent, `AbortSignal.timeout`, `Promise.withResolvers`, needed by `@nktkas/hyperliquid`).
2. Wrap the app in `OpenfortProvider` as in `app/_layout.tsx`; pass the fee sponsorship ID as `walletConfig.feeSponsorshipId`.
3. Log the user in (`useGuestAuth().signUpGuest()` or `useOAuth().initOAuth({ provider })`), then read
   `useEmbeddedEthereumWallet().activeWallet`.
4. Build the order action, reorder its keys with `canonicalize(OrderRequest.entries.action, action)`,
   hash it with `createL1ActionHash`, and sign the `Agent` typed data through `activeWallet.getProvider()`
   (`eth_signTypedData_v4`). POST `{ action, signature: { r, s, v }, nonce }` to `https://api.hyperliquid-testnet.xyz/exchange`.
5. To move USDC into Hyperliquid, send an ERC-20 `transfer(0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89, amount)`
   of USDC2 via `wallet_sendCalls` (minimum 5 USDC; smaller deposits are lost).

**Check it works**: after login the wallet address shows on the funding screen; after a 5+ USDC2 deposit the
Hyperliquid balance card turns "Ready" within a minute; a buy returns an order ID and shows under open orders.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`walletConfig.shieldPublishableKey`, `feeSponsorshipId`, `getEncryptionSession`, `supportedChains`) | `app/_layout.tsx` | Publishable + Shield publishable keys | [React Native quickstart](https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic) |
| Automatic recovery (encryption session) | `services/walletRecovery.ts` | Shield secret key + encryption share on your backend | [Automatic recovery](https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic) |
| `useGuestAuth` | `components/LoginScreen.tsx` | None | [useGuestAuth](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useGuestAuth) |
| `useOAuth` (`initOAuth`, Google/Apple) | `components/LoginScreen.tsx` | Google and Apple providers configured | [useOAuth](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useOAuth), [Social login](https://www.openfort.io/docs/configuration/social-login) |
| `useUser` | `app/index.tsx`, `components/UserScreen.tsx` | None | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useUser) |
| `useSignOut` | `components/UserScreen.tsx` | None | [useSignOut](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useSignOut) |
| `useEmbeddedEthereumWallet` (`activeWallet.getProvider()`) | `components/UserScreen.tsx`, `services/HyperliquidClient.ts` | None | [useEmbeddedEthereumWallet](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useEmbeddedEthereumWallet) |
| `eth_signTypedData_v4` via the EIP-1193 provider | `services/HyperliquidClient.ts` | None | [Sign messages](https://www.openfort.io/docs/products/embedded-wallet/react-native/wallet/actions/sign-message) |
| `wallet_sendCalls` via the EIP-1193 provider | `services/HyperliquidClient.ts#transfer` | Fee sponsorship policy | [Send transactions](https://www.openfort.io/docs/products/embedded-wallet/react-native/wallet/actions/send-transaction/ethereum) |
| Fee sponsorship policy (`OPENFORT_FEE_SPONSORSHIP_ID`) | `app.config.js` → `utils/config.ts#getFeeSponsorshipId` | Policy on Arbitrum Sepolia | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `useFunding`, `useFundingChains` | `components/onboarding/FundHyperliquidScreen.tsx` | Funding enabled | [Funding (React Native)](https://www.openfort.io/docs/products/embedded-wallet/react-native/wallet/funding), [Funding setup](https://www.openfort.io/docs/configuration/funding) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `Property 'receiverAddress' does not exist on type 'FundingPaymentMethod'.` (also `'deeplinks'`) | Since `@openfort/react-native` 2.1 (openfort-js 2.5) `session.paymentMethod` is a union that includes `FundingOnrampPaymentMethod`, which has no deposit address | Narrow first: `paymentMethod && paymentMethod.type !== "onramp"` before reading `receiverAddress` / `deeplinks` |
| No error; the Hyperliquid balance never increases after "Move to Hyperliquid" | Sent Circle's Arbitrum Sepolia USDC (`0x75faf114...`) instead of USDC2, or less than 5 USDC | Bridge2 only credits USDC2 (`0x1baAbB04529D43a73232B713C0FE471f7c7334d5`) and amounts >= 5; lost deposits are unrecoverable |
| `contextOrFilename.getFilename is not a function` | ESLint 10 breaks `eslint-config-expo`'s bundled `eslint-plugin-react` | Keep `eslint` on `^9.x` |

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
  from `ethereumProviderPolicyId`). Its value comes from `OPENFORT_FEE_SPONSORSHIP_ID`.
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
- `@openfort/react-native` is pinned to `2.1.2`.

## PR instructions
- Title format: `[hyperliquid] <summary>`.
- Update `.env.example` and `README.md` if new configuration flags are required.
- Attach simulator/emulator notes or screenshots in PRs that modify onboarding or trading flows.
