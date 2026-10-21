# AGENTS.md

## Project overview
- Expo React Native app (Expo 57 / RN 0.86): an Openfort embedded wallet signs in to Gnosis Pay, onboards the user, gets a Gnosis Pay account (a Safe the wallet owns) and a virtual Visa card, then funds the Safe with EURe.
- Uses the **Gnosis Pay User API** (`https://core.sandbox.gnosispay.in/user-api` or `https://core.prod.gnosispay.com/user-api`): SIWE auth with rotating access/refresh tokens, email OTP registration, terms, Sumsub KYC, source of funds, `POST /user/account`, `POST /cards/virtual`, `GET /user/balances/v2`.
- Gnosis Chain mainnet (id 100) for the Safe and funding. Sandbox runs the card side on a simulated network with Sumsub test documents; production needs a Gnosis Pay partnership.
- No backend: the wallet uses Openfort PASSWORD recovery and the app calls the User API directly. The wallet is an **EOA** so its SIWE signature is plain ECDSA.

## Setup commands
- `pnpm install`
- `cp .env.example .env`
- `pnpm start` (Expo dev client) / `pnpm run ios` / `pnpm run android`

## Environment
- `.env.example` lists every variable. `app.config.js` copies them into `expo.extra`, read through `lib/config.ts`.
- Required: `OPENFORT_PROJECT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`, `GNOSIS_PAY_SIWE_DOMAIN`.
- Optional: `GNOSIS_PAY_ENV` (`sandbox` default, or `production`), `GNOSIS_PAY_SIWE_URI`, `GNOSIS_PAY_APP_NAME`, `OPENFORT_FEE_SPONSORSHIP_ID`, `GNOSIS_RPC_URL`.
- Gnosis Pay access: ask the Gnosis Pay team for a sandbox invite to the [Partner Dashboard](https://partners.gnosispay.com) and get your SIWE domain whitelisted. Production credentials come only with a partnership agreement.
- Funding the card needs EURe on Gnosis Chain in the embedded wallet, plus a little xDAI for gas unless `OPENFORT_FEE_SPONSORSHIP_ID` is set.

## Testing instructions
- `pnpm verify` runs `eslint .`, `tsc --noEmit` and `node --test lib/session.test.ts` (token refresh/rotation). That is what CI checks.
- `npx expo export -p ios` bundles clean (2026-10-20).
- Not yet run end to end against the sandbox (2026-10-20): it needs a Partner Dashboard invite and a whitelisted SIWE domain. Walk login → SIWE → register → terms → KYC → SOF → create account → create card → fund before relying on it.
- `app.config.js` must keep the function form (`({ config }) => ({ ...config, extra })`) so it merges `app.json`.

## Add this to your app
1. Dashboard: an Openfort project with a publishable key and a Shield publishable key; optionally a gas sponsorship on Gnosis Chain. Gnosis Pay: a Partner Dashboard account and a whitelisted SIWE domain.
2. Install `@openfort/react-native@2.1.3`, `expo-secure-store`, `expo-web-browser` and `ethers@^6`.
3. Copy these files:
   - `lib/session.ts`: SIWE sign-in and the access/refresh token pair, with one shared refresh (a refresh token used twice logs the user out). No imports, framework-free.
   - `lib/gnosisPay.ts`: the session bound to `expo-secure-store`, typed User API calls, and `fundSafe` (ERC-20 transfer into the account Safe).
   - `lib/eip1193.ts`: `personal_sign` for SIWE and `eth_sendTransaction` from the embedded wallet.
   - `hooks/useGnosisPay.ts`: maps `GET /user/onboarding` (404 means "not registered") to the next step and loads account, balances and cards once onboarding completes.
4. Create the embedded wallet as an EOA (`accountType: AccountTypeEnum.EOA`). Its address becomes the only owner of the Gnosis Pay Safe and the only SIWE address, and cannot be changed later.
5. Drive the user from `GET /user/onboarding` status to status; see `components/CardDashboard.tsx` for every step.
6. Check it works: after `POST /user/account`, `GET /user/account` returns a `safeAddress`; after funding, `GET /user/balances/v2` shows the amount under `processingDeposits` and then `spendable`.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`walletConfig.shieldPublishableKey`, `recoveryMethod: "password"`, `accountType: EOA`, `feeSponsorshipId`, `supportedChains`) | `app/_layout.tsx` | Publishable + Shield publishable keys | [React Native quickstart](https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic) |
| `useGuestAuth` | `components/LoginScreen.tsx` | None | [useGuestAuth](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useGuestAuth) |
| `useEmbeddedEthereumWallet` (`create`, `setActive`, `provider`) | `components/CardApp.tsx` | None | [useEmbeddedEthereumWallet](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useEmbeddedEthereumWallet) |
| `useSignOut` | `components/CardApp.tsx` | None | [useSignOut](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useSignOut) |
| `personal_sign` via the EIP-1193 provider (SIWE) | `lib/eip1193.ts#personalSign` | None | [Sign messages](https://www.openfort.io/docs/products/embedded-wallet/react-native/wallet/actions/sign-message) |
| `eth_sendTransaction` via the EIP-1193 provider (fund the Safe) | `lib/eip1193.ts#eip1193SendTransaction` | Optional gas sponsorship | [Send transactions](https://www.openfort.io/docs/products/embedded-wallet/react-native/wallet/actions/send-transaction/ethereum) |
| Gas sponsorship (`OPENFORT_FEE_SPONSORSHIP_ID`) | `app.config.js` → `lib/config.ts#getFeeSponsorshipId` | Sponsorship on Gnosis Chain | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `403 Forbidden` (HTML body) from `GET /auth/siwe/{address}` | The SIWE `domain` is not whitelisted for your partner account | Set `GNOSIS_PAY_SIWE_DOMAIN` to the domain Gnosis Pay whitelisted, or ask them to whitelist yours |
| `[CONFIG] Missing GNOSIS_PAY_SIWE_DOMAIN. Use the domain Gnosis Pay whitelisted for you.` | `GNOSIS_PAY_SIWE_DOMAIN` is empty | Set it in `.env` and restart Metro with `--clear` |

## Gnosis Pay notes
- This recipe moved from `@gnosispay/account-kit` (the app deployed and configured its own Safe, Roles allowance and Delay cooldown) to the User API, where Gnosis Pay deploys the Safe on `POST /user/account`. Under the current infrastructure the Delay module is 25 h delay / 31 h expiration, the on-chain limit is a fixed $20K per token per day with no user signature, and withdrawals are instant through `POST /user/withdrawal`. Touching the Delay module directly blocks the card.
- The access token lasts 15 minutes, the refresh token 7 days and rotates on every use. `lib/session.ts` keeps the refresh token in the keychain and the access token in memory only.
- `POST /user` returns a new access token with the user id; every later call must use it (`session.useAccessToken`).
- Deposits go through AML screening (`processingDeposits`) before they become `spendable`.
- The sandbox card simulator (`https://core.sandbox.gnosispay.in/docs/simulator-api`) uses a Basic Auth password from onboarding. It is a partner secret, so it is not in this app; call it from a terminal.
- Supported tokens (Gnosis Chain): EURe, GBPe, USDCe. `lib/constants.ts#TOKENS_BY_CURRENCY` maps the account's `nativeCurrency` to the token to fund with.

## Code style
- TypeScript strict; Expo Router; functional components and custom hooks (no query library).
- `@openfort/react-native` is pinned to `2.1.3`, `typescript` to `~6.0.3`, `eslint` to `^9.x`, matching `hyperliquid` and `lighter`.

## PR instructions
- Title format: `[gnosis-pay] <summary>`.
- Update `README.md`, `AGENTS.md` and `.env.example` when env vars, setup, or the onboarding flow change.
