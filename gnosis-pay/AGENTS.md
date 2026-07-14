# AGENTS.md

## Project overview
- Expo React Native demo: an Openfort embedded wallet acts as the self-custodial owner of a Gnosis Pay account on Gnosis Chain (id 100).
- Uses `@gnosispay/account-kit` to create the account Safe, set it up (Roles + Delay modules + spending allowance), fund it with EURe, spend within the allowance, and query its integrity status.
- Does NOT issue the Visa card itself — that needs KYC (Sumsub) + a Gnosis Pay partnership. This recipe is the on-chain account a card attaches to.
- No backend: wallet uses Openfort PASSWORD recovery. The wallet is an EOA so signatures are plain ECDSA (required by account-kit).
- Gas is either paid in xDAI by the EOA (default) or sponsored via a Pimlico smart account + paymaster when `PIMLICO_API_KEY` is set.

## Setup commands
- `pnpm install`
- `cp .env.example .env`
- `pnpm start` (Expo) / `pnpm run ios` / `pnpm run android`
- `node scripts/verify-accountkit.cjs` — offline + live sanity check of the account-kit wiring

## Environment
- `.env` must define `OPENFORT_PROJECT_PUBLISHABLE_KEY` and `OPENFORT_SHIELD_PUBLISHABLE_KEY`.
- `OPENFORT_FEE_SPONSORSHIP_ID`, `GNOSIS_RPC_URL`, and `PIMLICO_API_KEY` are optional.
- Without `PIMLICO_API_KEY` the EOA needs a little xDAI (gas); with it, gas is sponsored. EURe (to load the card) is always needed — at the "fund address" (the relayer).

## Architecture
- `lib/constants.ts` — Gnosis Chain config, spendable token addresses (EURe/GBPe/USDCe), setup defaults.
- `lib/eip1193.ts` — adapts Openfort's EIP-1193 provider to account-kit's `SignTypedDataCallback` (re-adds `EIP712Domain` for `eth_signTypedData_v4`) and relays txs via `eth_sendTransaction`.
- `lib/gnosisPay.ts` — high-level: `predictCardAccount`, `createCardAccount`, `setupCardAccount`, `fundCard`, `spendFromCard`, `getCardStage`, `getRelayer`, `isPaymasterActive`. Its internal `relay()` routes each populated tx either through Pimlico (sponsored) or the EOA (xDAI).
- `lib/pimlico.ts` — when `PIMLICO_API_KEY` is set: a permissionless SimpleAccount (owner = embedded EOA) + Pimlico bundler/paymaster client; `sponsoredRelay()` sends a populated tx as a sponsored UserOp; `getSmartAccountAddress()` is the relayer address.
- `lib/rpc.ts` / `lib/erc20.ts` — read-only Gnosis provider + balances.
- `hooks/useCardAccount.ts` — loads stage, allowance, the relayer address, `sponsored`, and balances (read against the relayer).
- `components/` — `LoginScreen`, `CardApp` (wallet connect), `CardDashboard`, `ui`.

## Gotchas
- account-kit needs node's `assert`; `metro.config.js` maps it to the `assert` npm shim. Its deep `ethers/lib.commonjs/...` imports are type-only (`.d.ts`) and erased at runtime.
- `accountQuery` returns `UnexpectedError` (not `SafeNotDeployed`) for a never-deployed account, because EVM calls to an empty address succeed with no data. `getCardStage` checks `getCode` first to detect "not-created" — do not key UI off `accountQuery` for that case.
- The wallet must be an EOA. A smart-account owner would need ERC-1271 signatures, which account-kit's plain callback does not produce.
- Paymaster design: the EOA stays the Safe owner/signer; a Pimlico SimpleAccount owned by that EOA is the relayer/sender, the spend role-member (`config.spender`), and where EURe is held. A 4337 paymaster can't sponsor a plain EOA tx, hence the relayer. The card account's owner (and address) stays the EOA regardless of mode; an account set up in one mode has that mode's spender baked in.
- Spend uses the Roles module directly (`execTransactionWithRole`, role key `keccak256("SPENDING_ROLE")`), not account-kit's `populateSpend` (which assumes a separate Spender Safe). The spend recipient must equal the `receiver` scoped in `buildSetupConfig`.
- `metro.config.js` disables package-exports resolution for `@noble/hashes/*` (its 1.3.2 exports map omits the `crypto.js` subpath it self-imports) and shims `assert`.

## Testing instructions
- `pnpm exec tsc --noEmit` (typecheck) and `node scripts/verify-accountkit.cjs` both pass.
- `npx expo export -p ios` bundles clean (no warnings); `expo prebuild` + `npx pod-install ios` succeed.
- `app.config.js` MUST use the function form (`({ config }) => ({ ...config, extra })`) so it merges `app.json`. A static object replaces it, dropping `scheme`/`plugins`/`ios` and breaking `expo run:ios`.
- No automated UI tests. Verified building + launching on an iOS simulator (the redesigned login renders). Still walk login → create → set up → fund → spend → refresh before merge.
- Running on a simulator: `pnpm run ios` picks a *physical device* if one is connected and then fails on "No code signing certificates". Unplug the device (or set up Xcode signing) so it defaults to a simulator. To force a simulator build without signing: `xcodebuild -workspace ios/openfortgnosispay.xcworkspace -scheme openfortgnosispay -sdk iphonesimulator -destination 'id=<sim-udid>' -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO build`, then `xcrun simctl install booted <app>` + `launch`.
- Hot-reload dev uses the standard single-Metro `expo run:ios` flow. A hand-rolled "xcodebuild + separate `expo start`" split can desync async chunks (openfort-js lazy-`import()`s `@sentry/browser`) → "Requiring unknown module". A Release build (embedded bundle, no Metro) sidesteps it.

## PR instructions
- Title format: `[gnosis-pay] <summary>`.
- Update `README.md` if env vars, setup, or the on-chain flow change.
