# AGENTS.md

## Project overview
- Expo React Native demo (Expo 57 / RN 0.86) for Openfort embedded wallets with USDC transfers on **Ethereum Sepolia** (testnet).
- Creates two embedded wallets for a guest user, funds one from Circle's faucet, and sends USDC between them with a sponsored `wallet_sendCalls`.
- Base Sepolia is configured as a supported chain in the `OpenfortProvider`, but all transfer logic, USDC contract addresses, and faucet instructions target Ethereum Sepolia only.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local`
- `pnpm start` (Expo CLI)
- `pnpm run ios` or `pnpm run android` to launch on a device/emulator

## Environment
- `.env.example` lists every variable. `app.config.js` copies them into `expo.extra`; `utils/config.ts` reads them at runtime.
- Required: `OPENFORT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_RECOVERY_BASE_URL`.
- Optional: `OPENFORT_FEE_SPONSORSHIP_ID` (without it transfers are not sponsored and a console warning is logged).
- Make sure the Shield recovery service URL resolves from the target device so account restoration succeeds.
- Faucet links rely on Sepolia support; verify the fee sponsorship policy covers Ethereum Sepolia (11155111) before testing transfers.

## Testing instructions
- `pnpm verify` runs `eslint .` and `tsc --noEmit`. That is what CI checks; it does not build or run the app.
- Manually verify on a simulator/device with real keys: guest login, wallet creation (A and B), faucet funding, sending USDC, and wallet switching. Native builds and these flows were not re-run for the `@openfort/react-native` 2.1.2 upgrade (2026-09-23); only `pnpm verify` was.
- Watch Metro logs while testing and fix any warnings/errors observed during the flows above.

## Add this to your app
For a coding agent adding sponsored USDC transfers from an Openfort embedded wallet to an existing Expo app.

**Dashboard setup** ([dashboard.openfort.io](https://dashboard.openfort.io))
1. Copy the publishable key and the Shield publishable key (Project Settings > API Keys).
2. Create a fee sponsorship policy on Ethereum Sepolia (11155111) that covers the USDC contract
   `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`; copy its `pol_...` ID.
3. Deploy a recovery backend exposing `POST /api/protected-create-encryption-session` (it holds the Shield
   secret key and encryption share), for example [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart).

**Install**
```bash
npx expo install @openfort/react-native@2.1.2 expo-secure-store expo-crypto expo-application expo-apple-authentication react-native-webview react-native-get-random-values
```
Add `expo-secure-store` to `plugins` in your Expo config. Native modules mean you need a dev client
(`expo run:ios` / `expo run:android`), not Expo Go.

**Files that carry the integration**
| File | Role |
| --- | --- |
| `entrypoint.ts` | Loads `react-native-get-random-values` before `expo-router/entry` (set as `main` in `package.json`) |
| `app/_layout.tsx` | `OpenfortProvider` with `walletConfig` (`shieldPublishableKey`, `feeSponsorshipId`, `getEncryptionSession`) and `supportedChains` |
| `services/walletRecovery.ts` | `getEncryptionSession` callback: POSTs to your recovery backend and returns `session` |
| `utils/erc20.ts` | USDC `balanceOf` via `eth_call`, transfer via `wallet_sendCalls`, confirmation via `wallet_getCallsStatus` |
| `components/onboarding/CreateWalletsScreen.tsx` | Creates embedded wallets with `useEmbeddedEthereumWallet().create({ chainId: 11155111 })` |

**Steps**
1. Wrap the app in `OpenfortProvider` as in `app/_layout.tsx`, with Ethereum Sepolia in `supportedChains` and the fee sponsorship ID as `walletConfig.feeSponsorshipId`.
2. Log the user in (this recipe: `useGuestAuth().signUpGuest()`).
3. Create a wallet with `useEmbeddedEthereumWallet().create({ chainId: 11155111 })`; make it active with `setActive({ address, chainId })` before sending from it.
4. Get the EIP-1193 provider with `wallet.getProvider()` and send the ERC-20 `transfer(to, amount)` calldata with
   `wallet_sendCalls` (`chainId: "0xaa36a7"`, `calls: [{ to: USDC, value: "0x0", data }]`).
5. Poll `wallet_getCallsStatus` with the returned ID until `status === "CONFIRMED"`, then read `receipts[0].transactionHash`.

**Check it works**: fund the wallet from [faucet.circle.com](https://faucet.circle.com/) (Ethereum Sepolia);
the balance updates, a transfer returns a transaction hash, and the sender's Sepolia ETH balance stays unchanged (gas sponsored).

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`walletConfig.shieldPublishableKey`, `feeSponsorshipId`, `getEncryptionSession`, `supportedChains`) | `app/_layout.tsx` | Publishable + Shield publishable keys | [React Native quickstart](https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic) |
| Automatic recovery (encryption session) | `services/walletRecovery.ts` | Shield secret key + encryption share on your backend | [Automatic recovery](https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic) |
| `useGuestAuth` | `components/LoginScreen.tsx` | None | [useGuestAuth](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useGuestAuth) |
| `useUser` | `app/index.tsx`, `components/UserScreen.tsx` | None | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useUser) |
| `useSignOut` | `components/UserScreen.tsx` | None | [useSignOut](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useSignOut) |
| `useEmbeddedEthereumWallet` (`create`, `setActive`, `activeWallet`, `getProvider()`) | `components/UserScreen.tsx`, `components/onboarding/CreateWalletsScreen.tsx`, `components/MainAppScreen.tsx` | None | [useEmbeddedEthereumWallet](https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useEmbeddedEthereumWallet), [Active wallet](https://www.openfort.io/docs/products/embedded-wallet/react-native/wallet/active-wallet) |
| `wallet_sendCalls` / `wallet_getCallsStatus` via the EIP-1193 provider | `utils/erc20.ts` | Fee sponsorship policy | [Send transactions](https://www.openfort.io/docs/products/embedded-wallet/react-native/wallet/actions/send-transaction/ethereum) |
| Fee sponsorship policy (`OPENFORT_FEE_SPONSORSHIP_ID`) | `app.config.js` → `utils/config.ts#getFeeSponsorshipId` | Policy on Ethereum Sepolia | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `ERR_PNPM_UNUSED_PATCH  The following patches were not used: expo-modules-jsi@57.0.4` | `pnpm-workspace.yaml` patched `expo-modules-jsi@57.0.4`, but the resolved version moved to 57.1.0 | The patch (`abs` → `Swift.abs`) is fixed upstream in 57.1.0 (`milliseconds.magnitude`); it was removed. Delete stale `patchedDependencies` entries rather than re-pinning |

## Upgrade notes
- Targets **Expo SDK 57 / React Native 0.86**. Realign the `expo-*`/RN matrix with `pnpm expo install --fix`, not by hand. The 7-day `minimumReleaseAge` in `pnpm-workspace.yaml` can block the newest Expo patch releases; wait for the cooldown rather than excluding them.
- Uses `@openfort/react-native@2.1.2` (pinned exactly).
- `@openfort/react-native` walletConfig key is **`feeSponsorshipId`** (renamed from `ethereumProviderPolicyId`); its value comes from `OPENFORT_FEE_SPONSORSHIP_ID`.
- The `expo-modules-jsi` pnpm patch is gone (see Failure modes).

## Code style
- Stick to Expo Router conventions and functional React components with hooks.
- Keep Openfort state updates inside existing context/providers; avoid introducing new global singletons.
- `eslint-config-expo` (flat config in `eslint.config.js`) with `eslint` on `^9.x`.

## PR instructions
- Title format: `[usdc] <summary>`.
- Update `README.md` if onboarding, faucet steps, or required env vars change.
- Confirm the Expo app launches from a clean `pnpm start` before opening a PR.
