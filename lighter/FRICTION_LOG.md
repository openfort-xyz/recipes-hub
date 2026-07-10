# Friction log — Lighter recipe

Dated entries for everything that slowed this build down: missing/wrong docs, SDK gaps, confusing
APIs, workarounds, multi-attempt problems. Severity: blocker / major / minor.

---

## 2026-07-10 — [major] Guest sign-up errors were completely silent

First live simulator run: tapping "Continue as Guest" against a misconfigured Openfort project
did nothing visible — no error, no navigation, dead button. Root cause: `LoginScreen.tsx` called
`signUpGuest()` fire-and-forget (never awaited, never inspected the result) and the error banner
only ever rendered `useOAuth().error`, never `useGuestAuth().error`. `signUpGuest()` does return a
`{ user?, error? }` result rather than throwing, so the failure was there the whole time, just
never read. Found only by attaching a debugger during live simulator testing — `tsc`/`eslint`
have no way to catch "awaited but unused return value inspection," and there was no way to
exercise this path without a real (mis)configured project.

**Fix:** await `signUpGuest()`, `console.error` on `result.error`, and merge every auth path's
error into one displayed banner (`guestError ?? emailError`, see the LoginScreen OTP rewrite).

## 2026-07-10 — [major] `INVALID_CONFIGURATION` ("Storage is not accessible...") on the FIRST auth call, not at provider init — caused by CODE_SIGNING_ALLOWED=NO

Building and running the iOS app on the simulator with `CODE_SIGNING_ALLOWED=NO` (a common
speed-up for simulator-only builds — skips codesigning entirely) produces an app that boots fine,
renders the login screen fine, and only throws `OpenfortError` /
`INVALID_CONFIGURATION` ("Storage is not accessible...") the moment ANY auth call fires (guest
sign-up, OAuth, email OTP — doesn't matter which). The error message gives no hint that
code-signing is the cause. Root cause: `expo-secure-store` (and by extension
`@openfort/openfort-js`'s token/session storage) needs the iOS Keychain, and an unsigned app
binary cannot access the simulator's keychain — the SDK only touches storage lazily, on the first
authenticated action, not at `OpenfortProvider` init, so the failure is delayed and disconnected
from its actual cause. Cost a full debugging round before the connection was made.

**Fix:** none needed in code — just never build with `CODE_SIGNING_ALLOWED=NO` for any recipe
using Openfort's embedded wallet (or any other keychain-dependent SDK). Documented in AGENTS.md.

## 2026-07-10 — [major] Testnet is completely undocumented on apidocs.lighter.xyz — and its faucet endpoint doesn't exist in any doc at all

Every page checked on `apidocs.lighter.xyz` (get-started, deposits, api-keys, account-types,
trading, the llms.txt index) has zero testnet mentions, despite `https://testnet.zklighter.elliot.ai`
being a fully live, working environment. Had to establish testnet ground truth entirely from the
official Python SDK source (`lighter-python/lighter/endpoint_profiles.py` — the definitive list of
all four network profiles and their chain ids) and by probing the live API directly.

The funding mechanism was the biggest find: `GET /api/v1/faucet?l1_address=<addr>` isn't mentioned
anywhere, but calling `GET /api/v1/faucet` with no params returns HTTP 400 "invalid param" instead
of 404 — a strong signal the route exists and just wants an argument. `?l1_address=` was a guess
that happened to work, verified live (instantly credited a fresh address with USDC/ETH/LIT and
created its account, no wallet signature). Also found `GET /api/v1/layer1BasicInfo` (also
undocumented) confirms the same `FaucetContract` address exists in its `contract_addresses` list,
alongside testnet's L1 deposit contract and test-USDC addresses — cross-checking the SAME endpoint
on mainnet independently reproduced the exact contract addresses already reconstructed from
Blockscout in an earlier session, which was reassuring but came after the harder work was done.

Chased the on-chain deposit path for testnet before finding the faucet: `layer1BasicInfo` reports
testnet's L1 as `chainId 123456`, which turned out to be a red herring — that chain id belongs to
an entirely unrelated public chain ("ADIL Devnet" on chainlist.org), and no RPC subdomain guess
(`testnet-rpc.zklighter.elliot.ai` etc.) resolved. Concluded there's no usable public RPC for
Lighter's own testnet L1, and the faucet is the only implementable funding path. Also flagged:
testnet's `GET /api/v1/deposit/networks` lists Base/Arbitrum/Avalanche using their MAINNET chain
ids (8453/42161/43114), not testnet equivalents — looks like a config copy-paste bug on Lighter's
side, not a real CCTP-testnet integration; didn't build against it.

**Workaround:** none available (can't fix Lighter's docs) — documented everything found in
`docs/lighter-signing-notes.md` §3 with the exact commands used, so nobody has to redo this
exploration.

## 2026-07-10 — [major] No official TypeScript SDK for Lighter

Lighter only ships official SDKs in Python (`lighter-sdk` on PyPI) and Go
(`github.com/elliottech/lighter-go`). There's an open proposal for a TS SDK
(`elliottech/lighter-python#49`) but nothing shipped. Every community TS wrapper
(`lighter-ts-sdk`, `@reservoir0x/lighter-ts-sdk`, `@specialjp/lighter-sdk`, `lighter-node-client`)
is unofficial, with unclear provenance on what Go/signature-scheme version they wrap.

**Workaround:** vendored a WASM build of the official `lighter-go` signer ourselves — see
`server/signer/README.md` for the exact commit and build command. This keeps the trust boundary
at "official Go source we compiled" instead of "unofficial npm package with an opaque build."

## 2026-07-10 — [minor] `apidocs.lighter.xyz` guide pages omit the signing mechanism entirely

The "Create accounts programmatically" and "API keys" guide pages describe the *what* (deposit
creates an account; ChangePubKey registers an API key) but never state *how* the L1 wallet
authorizes ChangePubKey — no mention of `personal_sign` vs EIP-712, no message template shown.
Same gap for account creation: the docs say "simply deposit some assets" but don't confirm whether
the deposit transaction itself is the only required signature, or whether a separate account
registration step exists.

**Workaround:** read `lighter-go`'s source directly. `types/txtypes/change_pub_key.go` +
`types/txtypes/utils.go` show `calculateL1AddressBySignature` uses go-ethereum's `accounts.TextHash`
— the standard EIP-191 `personal_sign` prefix — over a fixed template string
(`TemplateChangePubKey` in `utils.go`). This is ground truth, not docs. See
`docs/lighter-signing-notes.md` for the full writeup with source citations.

## 2026-07-10 — [minor] `sendTx` error codes are inconsistent in specificity

Live-tested against mainnet (account_index=1, a real registered account) with four request
variants to characterize the server's validation layers:

| variant | HTTP | code | message |
|---|---|---|---|
| well-formed sig, unregistered key, valid nonce | 400 | 29500 | `internal server error` |
| well-formed sig, unregistered key, absurd nonce | 400 | 29500 | `internal server error` |
| corrupted signature bytes | 400 | 21120 | `invalid signature` |
| malformed JSON `tx_info` | 400 | 21501 | `invalid tx info` |
| nonexistent account index | 400 | 20001 | `invalid param ` |

The signature-verification layer clearly works (case 3 is distinct and specific). But a
cryptographically *valid* signature from a key that isn't authorized for that account collapses
into a generic `29500 internal server error` instead of something like "signature does not match
registered key" — makes debugging a real integration failure much harder than it should be,
since you can't tell "wrong key" apart from "the order I'm cancelling doesn't exist" apart from
any other downstream failure.

**Workaround:** none available without a funded/registered account; documented the distinction so
the next person doesn't waste time assuming 29500 means their wire format is broken.

## 2026-07-10 — [minor] `wasm/main.go`'s JS function signatures are entirely positional, unlabeled

`SignCreateOrder` alone takes 19 positional arguments with no JSDoc/TypeScript types anywhere in
the repo (it's a `.wasm` blob from Go's perspective). Getting an argument out of order fails
silently in some cases (`safeInt`/`safeUint8` etc. return a generic "argument N is undefined"
only if the arg is literally `undefined` — a wrong-typed-but-present value like a string where a
number is expected just gets coerced by `.Int()`).

**Workaround:** wrote a fully-typed TS wrapper (`server/signer/signer.ts`) with named parameters
so nothing in the rest of the codebase calls the raw positional globals directly.

## 2026-07-10 — [minor] Integrator/market "nil" sentinel values are not what you'd guess

`wasm/main.go`'s `SignCreateOrder`/`SignCancelAllOrders` bindings take raw integers for
"no integrator" and "no specific market" — there is no `null`/`undefined` support (the wasm
layer treats `undefined` as a hard error, not "use the default"). The natural guess is a
sentinel like `-1` or `MaxUint32`. The actual values, from `types/txtypes/constants.go`:
`NilIntegratorIndex = 0`, `NilIntegratorTakerFee = 0`, `NilIntegratorMakerFee = 0`, but
`NilMarketIndex int16 = 255` (used by `SignCancelAllOrders`'s `cancelAllMarketIndex` to mean
"all markets"). Passing `-1` for `cancelAllMarketIndex` still produces a validly-signed
transaction (the WASM layer doesn't reject it), it just silently encodes a real market index of
`-1` instead of the "no filter" sentinel — the kind of bug that only surfaces once you're
comparing signed output against the constants file, not from any runtime error.

**Workaround:** read `types/txtypes/constants.go` directly and hardcoded the exact sentinel
values as named constants in `server/signer/signer.ts` (`NIL_INTEGRATOR_INDEX`,
`NIL_INTEGRATOR_FEE`, `NIL_MARKET_INDEX`) rather than guessing.

## 2026-07-10 — [minor] `@openfort/openfort-node@0.10.8` pulls in a vulnerable transitive `axios`

`npm install` in `server/` reports 3 high-severity advisories, all from `@openfort/shield-js`
(an `@openfort/openfort-node` dependency) pinning a vulnerable `axios` range (prototype
pollution / SSRF / credential-leak class issues across many CVEs). `npm audit fix --force` wants
to downgrade `@openfort/openfort-node` to `0.6.73`, a breaking change, and still wouldn't fix it
at the source (it's `@openfort/shield-js`'s pin, not ours). Not something this recipe can fix —
flagging so it doesn't get mistaken for something introduced by this integration; belongs on the
Openfort backend SDK's own dependency-update backlog.

**Workaround:** none applied; documented as an inherited, out-of-scope finding.

## 2026-07-10 — [minor] "Latest stable" isn't always the right pin for Expo-adjacent tooling

`npm view typescript version` resolves to `7.0.2` (the new native/Go-ported compiler) and
`@babel/core` resolves to `8.0.1` — both real major-version jumps published as `latest` on npm.
Both are also core to how Metro/Expo transform and typecheck code, and every sibling recipe in
this repo still pins TypeScript 5.x and Babel 7.x. Rather than blindly take `latest` per the
"always look up current stable version" rule, pinned to the newest *5.x* TypeScript (`5.9.3`) and
*7.x* Babel (`7.29.7`) — the versions Expo 57's toolchain is actually proven against — and left a
note here instead of discovering a broken Metro bundle later. Not a bug, a documented judgment
call: "latest" should mean "latest within the major line the rest of the toolchain supports."

## 2026-07-10 — [minor] hyperliquid's app.json template references a nonexistent asset

Reused hyperliquid's `expo-build-properties` plugin config as a starting point, which points
`image` at `./assets/images/splash-icon.png` — a file that doesn't exist in that recipe's
`assets/images/` (only `splash.png`, `icon.png`, `adaptive-icon.png`, `favicon.png` are present).
Not something to fix in hyperliquid (out of scope for this task), but worth flagging since a
templated build config silently pointing at a missing file is the kind of thing that only
surfaces at `expo prebuild`/build time, not at typecheck or lint. Fixed in this recipe's own
`app.json` by pointing at `splash.png`.

## 2026-07-10 — [major] Deposit contract ABI isn't documented anywhere — had to reconstruct it from the verified bytecode

`apidocs.lighter.xyz`'s deposits page gives the function selector (`0x8a857083`) and a prose
description of the four parameters, but never the actual Solidity signature or an ABI. Getting
this wrong on mainnet means a reverted (or worse, silently wrong) real transaction. Reconstructed
it from the verified contract source on Blockscout (the deposit proxy at
`0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7` delegates to implementation
`0x831EF69BaB8AF8B1037a4961B8d0674b124E7008`) and independently confirmed by computing
`keccak256("deposit(address,uint16,uint8,uint256)")` locally and matching it byte-for-byte
against the documented `0x8a857083` selector — tried 6 plausible type variants and only this
exact combination matches:

```solidity
function deposit(address _to, uint16 _assetIndex, uint8 _routeType, uint256 _amount) external payable
```

Then verified the actual asset index values on-chain (not documented anywhere either) via
`eth_call` against `USDC_ASSET_INDEX()` (`0x7de213eb`) and cross-checked with
`tokenToAssetIndex(USDC_ADDRESS)` (`0x899cfa29`) — both return `3`. `NATIVE_ASSET_INDEX()`
(`0xbfda3066`) returns `1`. Route type `0` = perps margin (USDC-only, per docs).

**Workaround:** hardcoded the verified `deposit` ABI + `USDC_ASSET_INDEX = 3` in
`services/depositFlow.ts` with the exact `eth_call` commands used to verify them, so the next
person can re-verify rather than trust a comment.

## 2026-07-10 — [major] `OrderExpiry` validity depends on the `Type`/`TimeInForce` combination — no universal default

First cut of `signCreateOrder` hardcoded `orderExpiry = -1` (the wasm binding's "auto-fill to
now + 28 days" sentinel) for every order, following the vendored `test_wasm.mjs` example too
loosely. Immediately failed live: `OrderExpiry is invalid` for an Immediate-or-Cancel LimitOrder.
Reading `types/txtypes/create_order.go`'s `Validate()` line by line: `MarketOrder` and
`LimitOrder`+`ImmediateOrCancel` require `OrderExpiry == 0` (`NilOrderExpiry`);
`LimitOrder`+`GoodTillTime`/`PostOnly` require a real future millisecond timestamp;
`StopLoss*`/`TakeProfit*`/`TWAPOrder` have their own combinations again. There is no single value
that's valid across order types.

**Workaround:** made `orderExpiry` an explicit required parameter on `CreateOrderParams`
(`server/signer/signer.ts`) instead of a hardcoded default, forcing every call site to state
which regime it's in. This recipe's buy/sell flow only uses IOC LimitOrders (`orderExpiry: 0`),
documented inline.

## 2026-07-10 — [major] `SignChangePubKey` requires a signing client for the key being registered — easy to miss

First attempt at `buildChangePubKeyRegistration` called `generateApiKey()` then went straight to
`signChangePubKey()`, and got `client is not created for apiKeyIndex: 2 accountIndex: 1`. The fix
isn't obvious from the wasm binding's argument list alone: `SignChangePubKey` internally resolves
a `TxClient` via `getClient()`, which requires a prior `CreateClient()` call for that exact
`(apiKeyIndex, accountIndex)` pair — and per `client/tx_client.go`, `GetChangePubKeyTransaction`
Poseidon-signs using *that same client's own key*, i.e. registration is self-signed by the key
being installed (see `docs/lighter-signing-notes.md`). This resolves what looks like a
chicken-and-egg problem (how do you authorize installing the first API key with an API key?) but
isn't stated anywhere in the docs — you have to read `client.go` and `tx_client.go` together.

**Workaround:** `changePubKey.ts` now calls `createSigningClient(...)` with the freshly generated
private key immediately before `signChangePubKey(...)`.

## 2026-07-10 — [minor] Built against a fork base 34 commits behind upstream — env var naming drifted

This worktree's base (`origin/main`, the `joalavedra/recipes-hub` fork) was 34 commits behind
`upstream/main` (`openfort-xyz/recipes-hub`), including a repo-wide
`OPENFORT_SHIELD_PUBLISHABLE_KEY`/`OPENFORT_SHIELD_SECRET_KEY`/`OPENFORT_SHIELD_ENCRYPTION_KEY`
naming standardization that hadn't propagated to the hyperliquid recipe I was templating from at
worktree-creation time — my first pass used unprefixed
`SHIELD_PUBLISHABLE_KEY`/`SHIELD_SECRET_KEY`/`SHIELD_ENCRYPTION_SHARE`, matching the older
convention. Attempted `git rebase upstream/main` to pick up the real history, but the fork's own
tip commit (`2a093ff`, its own independent Shield-env-var rename) conflicts with upstream's
`d9841df` across 7702/aave/hyperliquid/morpho/usdc/vaults-fyi/x402 — none of it in `lighter/`, all
of it outside this task's scope to resolve. Aborted the rebase and instead pulled the canonical
names directly via `git show upstream/main:<path>` without merging, and renamed across
`lighter/`'s env files, `config.ts`, `envValidation.ts`, `app.config.js`, and docs.

**Correction (same day):** the entry above originally claimed the env var name itself was stale
and switched this recipe to `OPENFORT_FEE_SPONSORSHIP_ID`. That was wrong — the env var contract
is a monorepo-wide convention (`OPENFORT_ETHEREUM_PROVIDER_POLICY_ID`), not something a single
new recipe should rename unilaterally just because the SDK renamed its internal field. Only the
SDK's `walletConfig` property genuinely changed, from `ethereumProviderPolicyId` to
`feeSponsorshipId` (verified against `@openfort/react-native@1.1.7`'s `.d.ts` — confirmed correct
by the team lead, already handled the same way on the hyperliquid Cash App branch). Reverted to
`OPENFORT_ETHEREUM_PROVIDER_POLICY_ID` as the env var, mapped to `walletConfig.feeSponsorshipId`
in `app/_layout.tsx`, matching the `origin/recipe/hyperliquid-cashapp` branch exactly (fetched
from the fork for reference — Expo 57 deps, `ui/` design system, funding wiring; more current
than `upstream/main`'s hyperliquid where the two differ).

## 2026-07-10 — [minor] Go toolchain not preinstalled

`go` wasn't on the machine at all (`brew install go` needed, ~90s). Not really a Lighter-specific
issue, but worth flagging for anyone reproducing this build from scratch — the WASM vendoring
step has a hard dependency on a local Go toolchain, which is unusual for a `recipes-hub` sample
otherwise entirely TypeScript/Expo.
