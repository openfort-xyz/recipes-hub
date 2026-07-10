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

## 2026-07-10 — [minor] No working Lighter block explorer found — testnet or mainnet

Asked to add a "View on explorer" link to the order confirmation screen. Web search initially
surfaced `scan.lighter.xyz` with convincing-looking detail (transaction counts, beta-status
copy) — but `getaddrinfo ENOTFOUND` on direct DNS resolution for both `scan.lighter.xyz` and a
community-referenced `scan.testnet.lighter.xyz` (via `lightertest.net`, an unofficial site).
Checked every plausible official source directly: `lighter.xyz`'s homepage has no explorer link
anywhere in its footer/nav, `docs.lighter.xyz` has zero mentions of a block explorer or
transaction lookup, and `testnet.app.lighter.xyz` (the actual trading app) exposes no explorer
link either. The search engine's detailed-sounding summary was almost certainly stale/cached
index content from a domain that no longer resolves, not a live fetch — a reminder that a
search result's confident tone isn't evidence a URL is currently live.

**Workaround:** no explorer link anywhere in the app. The order confirmation screen shows the
raw `tx_hash` as selectable text instead — real data, not a fabricated link pattern.

**Correction (2026-07-10, same day):** the search-driven investigation above missed a real
explorer hosted *inside* the trading app rather than on a standalone subdomain — checked
`testnet.app.lighter.xyz`'s footer/nav for an explorer link, but never tried a direct
`/explorer/logs/<tx_hash>` path. Verified live in a real browser (not just curl, since the app
is a client-rendered SPA that returns the same 200 shell for any path — a curl 200 alone doesn't
prove the route works): `https://testnet.app.lighter.xyz/explorer/logs/<tx_hash>` renders real
trade/log detail (batch, block, market, size, price, maker/taker) for a hash that exists, and
correctly renders "Log not found" for one that doesn't — so it's a genuine lookup, not an SPA
catch-all. Mainnet has the same route at `https://app.lighter.xyz/explorer/logs/<tx_hash>` (same
"Log not found" behavior for a hash from the other network, confirming it's a real per-network
lookup too). No transformation needed on the hash — it's used exactly as returned by `sendTx`'s
`tx_hash` field, no `0x` prefix, no case change. Now wired into `TradingScreen.tsx`'s order
confirmation screen, base URL picked from the server-reported `network` field.

## 2026-07-10 — [minor] `orderBookDetails` (undocumented) replaces the documented `orderBooks` for both market discovery and live pricing

`GET /api/v1/orderBookDetails` (no `market_id`) returns every active market — perp and spot — in
one call, each with `mark_price`/`last_trade_price` alongside the size/price decimals needed for
order encoding. That's a strict superset of the documented `/api/v1/orderBooks` (metadata only,
no live price), found by trying the singular form of the documented plural endpoint on a hunch.
One call now serves both the asset-selector's live price tiles and the per-market precision
order/orderbook validation previously split across two endpoints.

Also notable: testnet has exactly 5 active markets total (ETH/BTC/SOL perps, ETH/USDC and
LIT/USDC spot) — "5 assets" isn't a curated subset of a larger catalog, it's the complete
tradeable set today. And spot pricing is pure testnet play-money (ETH/USDC quoted at $0.01, not
a real ETH price) — worth knowing so a screenshot of the app doesn't get mistaken for a pricing
bug.

## 2026-07-10 — [major] `sendTx` never reports fill status — "filled vs resting" has to be inferred from position deltas

Assumed the order-submission response would say whether an IOC order actually filled. Inspected
the raw upstream JSON directly (temporarily logged it server-side, placed a real tiny order,
reverted the log): the full response is `{code, message: '{"ratelimit": "Ratelimit is off"}',
tx_hash, predicted_execution_time_ms}` — genuinely nothing about fills, no order status field at
all. Confirming a fill requires a follow-up read: capture the account's position (perp) or asset
balance (spot) for that market before submitting, wait ~2s, refetch, and diff.

**Workaround:** `TradingScreen.tsx#getRelevantBalance` does exactly that diff and labels the
confirmation screen "Filled" / "Not filled" / "Submitted" (if the follow-up refetch itself
failed) — never a fabricated "Filled" it can't actually back up. Since this recipe's buy/sell
flow is IOC-only by design (see the earlier `OrderExpiry` friction entry), "resting" genuinely
cannot happen here, so the confirmation UI doesn't offer that as a possible status.

## 2026-07-10 — [major] Lighter's testnet faucet is intermittently flaky (~1-in-3 success rate)

First real user hit "Faucet request failed: internal server error" on the very first tap. Live
probes with fresh addresses confirmed it's not a one-off: five consecutive `GET /api/v1/faucet`
calls returned `29500`, `200 ok`, `29500`, `29500`, `29500` in sequence, while `/api/v1/orderBooks`
(hit interleaved with the same requests) stayed consistently healthy — so this is specific to the
faucet path, not general API degradation. No `Retry-After` or rate-limit headers on the failures;
it looks like plain backend flakiness surfacing as a generic 500 through CloudFront, not
throttling. Roughly one in three faucet calls succeeds at any given moment (small sample, but
consistent with what the user hit).

**Workaround:** `requestFaucet` now retries up to 3 times with a 2s delay between attempts before
surfacing an error (`server/src/lighterApi.ts#withRetry`), and the final error message states the
attempt count so it's clear this isn't a client-side bug. The app's error banner suggests retrying
rather than implying something is broken. Server-side errors (previously silent — the client saw
a failure but the server logged nothing) now log one structured line per failed request
(`route`, `lighterCode`, `message`) so a flaky-faucet report is diagnosable from server logs alone
next time, without needing to reproduce it live.

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

## 2026-07-10 — [minor] Onboarding briefly showed the mainnet deposit card while `serverConfig` was still loading

`OnboardingStatusScreen.tsx` derived `isTestnet` from `serverConfig?.network === "testnet"`.
While `serverConfig` was still `null` (before the first `/api/lighter/config` fetch resolved),
`isTestnet` evaluated to `false`, so the "deposit" step briefly rendered the mainnet "Deposit
USDC / Real gas, real funds" card instead of a neutral loading state — never the testnet faucet
card first, on every fresh mount. Cosmetic (self-corrects within ~1 render once `serverConfig`
loads) but genuinely wrong content, caught via a live cold-reload in the simulator.

**Fix:** gate both deposit cards on `serverConfig` being non-null (`step === "deposit" &&
serverConfig && isTestnet` / `... && !isTestnet`), and show the spinner whenever `serverConfig`
hasn't loaded yet, not just when `isLoading` is combined with `!account`.

**Investigation note (live trading-bug report):** this fix came out of live-verifying a separate
report — "every order attempt shows an error like 'no match between the buffers'". That string is
almost certainly `TradingScreen.tsx`'s real "No match within the slippage buffer — nothing was
charged." status text. Reproduced the app's exact order-construction logic directly against the
live `:3008` server (fresh order-book price, and separately a deliberately 3s-stale price to
match the app's worst-case poll staleness) for both a perp market (ETH) and a spot market
(LIT/USDC), buy and sell: every attempt filled correctly. Server nonce handling, WASM signing,
and per-market precision all checked out — none of the three suspected root causes (nonce
desync, WASM buffer/precision bug, client/server contract drift) reproduced.

**Correction:** concluded from this that the user likely hit genuine testnet illiquidity. That
was wrong — see the next entry for the actual confirmed root cause (a fill-detection race, found
by checking the account's real trade history) and its fix.

Separately, while live-testing via the simulator (Cmd+D dev menu, Cmd+R reload, and a hard
`simctl terminate`+`launch` app relaunch — none of which a real user does when just
backgrounding/reopening the app), the embedded wallet's `useEmbeddedEthereumWallet` create-vs-
reconnect effect in `UserScreen.tsx` landed on `status: "disconnected"` with an empty `wallets`
list after a hard relaunch and created a fresh wallet, orphaning the session from the
already-registered account 171. This matches the SDK's own documented usage pattern exactly (see
`useEmbeddedEthereumWallet.d.ts`'s example), so it isn't clearly a bug in this recipe's code —
more likely a characteristic of guest-session persistence under a hard process kill, which normal
iOS backgrounding doesn't trigger. Flagged, not fixed, since account 171's funds and server
registration are unaffected (verified directly against Lighter's API) and reproducing it safely
needs a real device/guest-auth investigation outside this session's scope.

## 2026-07-10 — [blocker] Fill-detection was a race, not an illiquidity problem — confirmed via the account's own trade history

Following up on the entry above: the team lead pushed back on the illiquidity conclusion because
it didn't explain "every asset" — unlucky books wouldn't hit uniformly. Right call. Two things
proved it:

1. **The user's orders had actually been filling all along.** `GET /api/v1/trades` (undocumented
   on apidocs.lighter.xyz beyond a bare parameter list; requires `sort_by`+`limit` or it 400s with
   `invalid param`, and an `authorization` header for any account-scoped query) returned account
   171's full trade history. Cross-referencing against every order this session's own testing
   placed left 7 unaccounted-for fills — spanning ETH and SOL, both directions, timestamped
   13:45–14:19 UTC, squarely inside the window the user was reported testing in. Those are almost
   certainly the user's own attempts, and they filled. The app was telling him "no match" for
   trades that had actually gone through.
2. **Reproduced the exact race.** `TradingScreen.tsx`'s old flow captured a "before" balance,
   submitted the order, slept a flat 2000ms, then read the balance once more and diffed. Submitted
   an order and checked the position with *zero* delay: it read the pre-fill value. The trade
   confirmed in `/api/v1/trades` a moment later. A flat delay with a single check has no way to
   distinguish "still processing" from "genuinely didn't match" — any execution latency spike past
   2000ms (real, since Lighter's testnet matching engine's own timing varies — see below) reads as
   a false negative, and the message shown for that was "No match within the slippage buffer —
   nothing was charged", actively telling the user money never moved when it had.

**Also newly confirmed:** `predicted_execution_time_ms` (present on `sendTx`'s response, silently
discarded until now) is a Unix **timestamp** in milliseconds, not a duration — decoded a live
sample (`1783695021910`) against wall-clock time at response receipt and it landed ~470ms in the
future, consistently across 5 back-to-back samples (~460–500ms each). Useful as a lower bound for
how long to wait before checking at all, but not something to trust as an upper bound — Lighter
gives no matching guarantee, and thin/erratic testnet books mean actual latency isn't provably
capped at whatever this field says.

**Fix — moved fill confirmation server-side, made it authoritative, dropped the balance-diff
guess entirely:**
- `server/src/fillConfirmation.ts` (new): `waitForFillConfirmation` polls an injectable
  `fetchTrades` for a tx_hash match, bounded by a real timeout (8s poll budget after an initial
  wait derived from `predicted_execution_time_ms` via `computeInitialWaitMs`, clamped 300ms–5s).
  Fully unit-tested with an injected virtual clock (`fillConfirmation.test.ts`) — no real waiting,
  no flaky fake-timer edge cases — covering: immediate match, match after several empty polls
  (the exact race this replaces), genuine timeout with no match ever appearing, a transient
  fetch error mid-poll, and a trade present but for a different tx_hash.
- `server/src/lighterApi.ts`: new `getAccountTrades` wraps `/api/v1/trades`; `sendTx`'s return
  type now actually carries `predicted_execution_time_ms` instead of dropping it.
- `server/src/orders.ts`: `submitCreateOrder` now waits for and confirms the fill itself before
  returning — `{ txHash, signedHash, filled: boolean, trade?: {size, price} }`. `filled: false`
  means "no matching trade observed within the wait budget", never "confirmed no match" — IOC
  orders that genuinely expire unmatched leave no record either way, so there's no way to prove a
  negative here, only to stop claiming one.
- New `GET /api/lighter/trades` route + `getRecentTrades` (mirrors `getAuthToken`'s pattern) for
  any future use of the authoritative trade record.
- `TradingScreen.tsx`: deleted the `getRelevantBalance` diff entirely, the `account` prop it
  needed, and the flat `sleep(2000)`. `handleSubmit` now just awaits `createOrder` (which can take
  a few seconds — already covered by the Confirm button's existing spinner) and trusts its
  `filled`/`trade` fields directly. Confirmation screen shows "Filled" with the actual matched
  size/price when confirmed, or "Couldn't confirm" with "Didn't see it land within a few seconds —
  check your portfolio before retrying" when not — never "nothing was charged" again.

Live-verified end to end through the user's own `:3008` instance post-fix: a real ETH buy returned
`{"filled":true,"trade":{"size":"0.0084","price":"1786.35"}}` in 4.5s total. A deliberately
unmatchable order (priced at half the market, guaranteed not to cross) correctly returned
`{"filled":false}` with no fabricated trade, after exhausting the full ~10s wait — the honest
"couldn't confirm" path, not a lie in either direction.

## 2026-07-10 — [blocker] The "Activate server" gate checked that a key existed, not that it was the RIGHT key — split-brain trading

After the wallet-session orphaning (see the [minor] entry above about `useEmbeddedEthereumWallet`
creating a fresh wallet on a hard relaunch), the user re-onboarded: new wallet, new Lighter
account (175), a fresh ChangePubKey registration, new env values printed. He copied them in and
the app moved past "Activate server" — but the server was still running with the OLD account
(171)'s env. The gate only checked `serverWalletConfigured` (some `LIGHTER_API_KEY_PRIVATE_KEY` +
`LIGHTER_ACCOUNT_INDEX` are set), never WHICH account. Trading looked broken again from a totally
different cause than the fill-detection race two entries up: orders were signing and filling on
171 while the app displayed 175's (empty, from its perspective) portfolio — cash never appeared to
move, no positions ever showed up, because the app was watching the wrong account's data.

**Fix:**
- `GET /api/lighter/config` now returns `accountIndex` (`server/src/routes.ts#handleConfig`) — an
  integer, not a secret, safe to expose.
- `useLighterOnboarding.ts#deriveStep` treats a mismatched `accountIndex` the same as "not
  configured" (stays on the `activateServer` step) instead of advancing to `ready` the moment
  *some* key exists. A new `accountMismatch` field distinguishes the two causes so
  `OnboardingStatusScreen` can show the right recovery card: reprint this session's credentials
  if still in memory, or a "Re-authorize" button (reuses the existing `handleRegister` — the
  ChangePubKey flow doesn't special-case an already-registered index, so re-running it should
  rotate to a fresh key; couldn't verify the live outcome of that specific rotation without a real
  user's `personal_sign`, so the existing generic "Registration failed" error path is what
  surfaces if the server ever rejects it).
- Defense-in-depth for if this recurs mid-session (server restarted with a stale env while the app
  keeps trading): every order/cancel request now carries the app's own `accountIndex`, and
  `server/src/routes.ts#checkAccountMatch` 409s before signing anything if it doesn't match the
  server's configured account. Live-verified: a request for account 171 against a server
  configured for 175 gets `409 {"error":"Server is configured for account 175, but this request is
  for account 171. ..."}`; the same request with `accountIndex: 175` fills normally.
- Portfolio staleness compounded the confusion (positions genuinely weren't updating between
  trades without a manual reload). `UserScreen.tsx`'s account fetch was mount-only with no
  ongoing poll; added a 5s interval alongside the existing on-order refresh, plus explicit
  refreshes on "Done" and "Back to assets" so returning to the portfolio never shows stale data
  waiting on the next poll tick.

Live-verified post-fix against the user's real account 175: fetched its ETH position
(0.0277), placed a real order through `:3008` with the matching `accountIndex`, got back
`{"filled":true,"trade":{"size":"0.0083","price":"1792.75"}}`, and the account endpoint
immediately reflected the new position (0.0360 = 0.0277 + 0.0083) — no leftover resting orders.

## 2026-07-10 — [blocker] `useEmbeddedEthereumWallet` mints a brand-new wallet on reload — the account-mismatch bug's real root cause

The account-identity gate fix above stopped the *symptom* (a mismatched account silently
reaching the trading screen) but not the *cause*: the app kept generating brand-new embedded
wallets. The user burned four Lighter accounts in one session (171→175→177→178) — each one a
fresh wallet the app had minted for itself, not a wallet the user asked for.

**Root cause, read from `@openfort/react-native@1.1.7`'s actual JS source (not just the
`.d.ts` files), traced in two layers:**

1. `UserScreen.tsx`'s create-vs-reconnect effect treated `ethereum.status === "disconnected" &&
   wallets.length === 0` as "definitively no wallet, safe to create". But
   `useEmbeddedEthereumWallet.js#fetchEmbeddedAccounts` early-returns `setEmbeddedAccounts([])`
   for `embeddedState === EmbeddedState.NONE` (the SDK's own pre-restore placeholder) *without*
   ever setting `status: 'fetching-wallets'` — so during that placeholder window the hook reports
   exactly the same shape as "authenticated, checked, genuinely has no wallet". First fix: gate
   the effect on `embeddedState !== EmbeddedState.NONE` (via `useOpenfortContext()`, exported but
   never used anywhere in this app before now).
2. That fix alone wasn't enough — live-verified. `embeddedState` and the `embeddedAccounts` list
   are two *independently timed* async operations inside the SDK (separate `useEffect`s with
   separate dependencies), and `embeddedState` can reach `READY` before the accounts fetch has
   resolved. Instrumented the effect directly and caught it on the very first render of a fresh
   launch: `{"embeddedState":4,"status":"disconnected","walletsLen":0,"hasTriggeredCreate":false}`
   — `embeddedState` already `READY` (4), `wallets` still empty. Chasing the SDK's exact internal
   ordering to find a state combination that's *always* trustworthy turned out to be a moving
   target; settled on a debounce instead — wait `WALLET_SETTLE_MS` (1500ms) for the
   "disconnected + no wallets" snapshot to hold steady (any state change in that window cancels
   the timer via the effect's cleanup) before trusting it enough to call `create()`.

**Verification:** captured the wallet address via a temporary `console.error` + `xcrun simctl
spawn booted log stream` (no UI ever shows it), ran three consecutive `simctl terminate` +
`launch` cycles, 12+ seconds of observation each. Pre-fix: the address changed *within* a single
session a few seconds after launch, not just across relaunches. Post-fix: the exact same address
(`0x808f26dde96d3b7f4720ab4a9b110d4b0148aded`) held across all three relaunches with zero
deviation. Debug instrumentation removed before committing.

**Residual risk, documented rather than hidden:** 1500ms is an empirically-justified margin (the
observed race window was tens of milliseconds), not a provable bound — a sufficiently slow
device/network could theoretically still exceed it. This is a workaround for SDK-internal timing
this recipe doesn't control, not a fix to the SDK itself; flagging upstream is out of scope here.

## 2026-07-10 — [blocker] Onboarding readiness was two separate hooks that could disagree — the actual account-mismatch delivery mechanism

Even with the wallet-churn root cause fixed, the *specific* symptom the team lead caught (account
178, zero registered API keys, still reached the trading screen) had its own separate cause:
`UserScreen.tsx` and `OnboardingStatusScreen.tsx` each ran their own independent
`useLighterOnboarding(walletAddress)` call — two separate `fetch` cycles, two separate copies of
`account`/`apiKeys`/`serverConfig` state, updating on their own schedules. When the wallet address
changed, there was a window where one hook's state had caught up to the new address and the other
hadn't. `UserScreen`'s `view` state was also a one-shot flag set once via an `onReady` callback and
never re-validated — once flipped to `"trading"`, nothing checked whether the account backing it
was still actually ready.

**Fix:** lifted `useLighterOnboarding` up into `UserScreen` as the single source of truth;
`OnboardingStatusScreen` now receives the onboarding state as a prop instead of calling the hook
itself, and the `onReady` callback is gone entirely — `UserScreen`'s render gate is
`if (onboarding.step !== "ready") return <OnboardingStatusScreen .../>`, re-evaluated fresh every
render from the hook's own continuous 2s poll. This also means the gate self-heals: if the server
env ever changes mid-session (a restart with a different account), the very next poll tick kicks
the user back to onboarding automatically, without anyone having to notice and navigate manually.

Extracted the gate conditions (`deriveStep`, `accountsMismatch`) into a new dependency-free module
(`hooks/onboardingGate.ts`) so they carry a regression test independent of the hook's React/fetch
machinery. Importing `useLighterOnboarding.ts` directly into vitest fails — `react-native`'s Flow
syntax isn't parseable by Vite/Rolldown (`RolldownError: Parse failure: ... Flow is not
supported`) — so the pure logic needed to live somewhere with zero runtime `react`/`react-native`
imports to be testable at all. Added a minimal `vitest.config.ts` scoped to `hooks/**/*.test.ts`
only (not a full RN component-testing setup) plus `vitest` as an app-level dev dependency, pinned
to the same `4.1.10` already used server-side; confirmed zero new supply-chain risk (`npm audit`
shows no vitest/vite/esbuild-related advisories — the 25 pre-existing ones are all from the
Expo/RN dependency tree, unrelated).

Also added a `LighterServerError` class (carries the HTTP status) so the client can react to a
409 specifically instead of pattern-matching an error string, and a "Fix setup" button on the
trading screen's order-failure alert for the (now much narrower) case where a mismatch appears
mid-session — it just forces an immediate refresh; the render gate above does the actual
navigating once it sees the mismatch.

**Verification:** `hooks/onboardingGate.test.ts` (9 cases) covers the exact regression —
`deriveStep` must return `"activateServer"` (never `"ready"`) when an account has a registered
key but the server is configured for a different account, and `"registerApiKey"` (never
`"ready"`) when the account has zero registered keys, individually and combined. Live-verified
the unified flow end-to-end: called the testnet faucet via curl for the now-stable wallet address,
watched the app auto-advance from "Fund your account" to "Authorize trading" within 3 seconds
with no manual refresh — confirming the single-source-of-truth poll drives the UI correctly.
`personal_sign` (step 2) and copying env values (step 3) need the real device/wallet and are left
for the user to complete.

## 2026-07-10 — [blocker] ChangePubKey is a rotation, not a re-print — signing twice silently strands the server on a dead key

Fallout from the account-identity fix above: the account/apiKeyIndex-based gate correctly caught
"wrong account", but had no way to catch a NARROWER, nastier trap — the user tapped "Sign &
authorize" for account 179, then tapped it again (poll hadn't advanced the UI away from that step
yet). ChangePubKey doesn't "reprint an existing key" — it installs a brand new one at the same
`(account, apiKeyIndex)` slot, overwriting whatever was there. The server had already been given
the FIRST key; the chain now only recognizes the SECOND. Every subsequent order failed
`21120 invalid signature`, and `deriveStep`'s inputs (account matches, apiKeys.length > 0, server
configured) all still looked completely fine — the on-chain key changing underneath the server is
invisible to every signal the gate was checking.

**Investigated whether the vendored WASM can detect this directly**, per the request: enumerated
every JS global the compiled binary actually registers (`GenerateAPIKey`, `CreateClient`,
`CreateAuthToken`, `SignChangePubKey`, and 16 other `Sign*` functions — a fuller list than
`signer.ts`'s wrapper had ever needed before) and found one undocumented until now: `CheckClient`.
It makes a REAL network call from inside the Go/WASM sandbox (`GET /api/v1/apikeys?account_index=`)
rather than delegating to JS's `fetch` the way every other exported function does — and that call
fails under Node with a DNS resolution error (`wasm_exec.js` is Go's browser-oriented glue file;
whatever `net.Dial` shim it expects isn't there in this environment). Confirmed this isn't a
sandbox/permissions issue — same failure with the sandbox disabled. Not something to patch around
in vendored SDK glue code; ruled out.

**Fallback approach, live-verified instead:** signed and submitted a real (harmless — the order
index can never exist, so it can never cancel anything or move funds) CancelOrder using a
throwaway, never-registered key. Got back exactly `{"code":21120,"message":"invalid signature"}` —
the same code the user's real orders were failing with, and distinct from the generic `29500`
other failure classes return (see the earlier "sendTx error codes are inconsistent" entry). This
is a strictly more faithful self-test than the auth-token approach the task suggested as an
example — tried that too first: a bad auth token against `accountActiveOrders` comes back as a
generic `29500 internal server error: invalid signature`, not the specific `21120` the order path
actually produces, which would need message-substring matching instead of a clean code check.

**Fix — four pieces:**
1. `server/src/keySelfTest.ts` + wiring in `orders.ts`/`server.ts`: submits the real self-test
   CancelOrder once at startup (background, non-blocking — a network hiccup here shouldn't hang
   the whole server) whenever key material is configured. `GET /api/lighter/config` now reports
   `serverKeyInvalid` and — this is the part that actually closes the gate — `serverWalletConfigured`
   itself goes `false` on a proven-invalid key, so `deriveStep` already routes back to
   `activateServer` with zero changes to the gate logic itself.
2. `server/src/changePubKey.ts`: every successful registration now also writes `server/.env.pending`
   (git-ignored) with the three values, a timestamp, and instructions — not a replacement for the
   app screen, a backstop for it. The private key itself was already kept out of console output on
   purpose (log aggregators are a bigger exposure surface than a local git-ignored file); this adds
   a durable copy without reversing that.
3. `TradingScreen.tsx`: an order/cancel failure with code 21120 gets its own alert — "the server's
   key looks stale, most likely authorized twice" — with a "Re-authorize" action, same pattern as
   the existing 409 "Fix setup". Since `deriveStep`'s own inputs don't change when only the
   on-chain key rotates, this needed a way to force the onboarding screen open regardless of what
   step currently computes to: a `keyStale` flag in `UserScreen`, auto-clearing once the
   underlying data genuinely reaches "ready" again (i.e. the operator actually restarted with a
   working key).
4. `OnboardingStatusScreen.tsx`: the exact race that caused this — sign, then tap again before the
   ~2s poll moves the UI off the "Sign & authorize" button — now has an explicit local guard
   (`hasSignedThisSession`) independent of the poll's timing, not just the button's normal
   in-flight `loading` state. Resets on any step transition, so it doesn't block the *next*
   legitimate authorize (initial or recovery) — just an immediate double-tap of the same one.

**Regression tests:** `server/src/keySelfTest.test.ts` (5 cases) covers the pure classification —
the specific 21120 signature is invalid, everything else (a generic 29500, a network error,
success, no code at all) is not, so a network blip or an unrelated failure class never
false-alarms the operator into re-authorizing when nothing was actually wrong with the key.

**Did not live-verify against the user's real session** — the server was deliberately mis-pinned
to a placeholder account at the time to let the user reach the (unrelated) account-mismatch card,
and touching `.env.local` or restarting with real credentials would have stepped on that in-flight
test. The 21120 classification and the self-test's real on-chain call were both verified live via
an isolated throwaway key instead (see above) — the same signal, reproduced independently rather
than on the account that mattered.

**Addendum — traced the actual live incident, not just the general trap.** The team lead initially
reported the rotation as an "auto-fire" — a new key appearing with "no visible prompt". Audited
the exact build that was live at the time (`de0334a`, the gate-unification commit, before the
four fixes above) and every commit in this file's history back to the original scaffold:
`handleCheckAgain` has only ever called `refresh()` — a pure read, no signing, in every version.
There is no code path, at any point in this recipe's history, where anything other than an
explicit tap on a "Sign & authorize"/"Re-authorize" button calls `registerLighterApiKey`.

Final reading, from the user's own account of what happened: app reloaded (any in-memory
`registrationResult` gone), server mis-pinned, user on the "Wrong account on the server" card
looking for a "Sign and authorize" option — none was available (that label only exists on the
*first-time* `registerApiKey` step; this account already had a key, just the wrong one from the
server's point of view), so he tapped the one button that *was* there: "Re-authorize". That's a
completely legitimate `onPress` → `handleRegister` call, not a bug. What made it feel like "no
visible prompt": embedded-wallet `personal_sign` has no separate native confirmation dialog the
way a browser-extension wallet would — it signs programmatically, no modal — so from his
perspective nothing asked him to sign while a real rotation happened underneath. Promptless-by-
design embedded signing means a key-rotating button has to carry its own, unmistakable warning;
nothing upstream will provide one.

**Fix:** "Re-authorize" (recovery cards only — never the first-time "Sign & authorize", which has
no existing key to destroy) now goes through an `Alert.alert` confirmation ("Generate a new
trading key? This replaces whatever key the chain currently has... with no way to get it back")
before calling `registerLighterApiKey`. `Cancel` is the default; the destructive action needs an
explicit second tap on "Generate new key". This is a genuinely different fix from the
double-sign debounce two entries up — that one stops a second tap of the *same already-completed*
action; this one adds a deliberate pause before the *first* tap of a destructive one, precisely
because the SDK provides no native equivalent.

## 2026-07-10 — [major] The whole "copy printed credentials into server/.env.local and restart" step was over-engineering, not a feature

Every fix in the four entries above (self-test, `.env.pending`, the 21120 recovery card, the
double-sign debounce) treated the manual hand-off from `POST /changepubkey/submit`'s response to
`server/.env.local` as a given and built machinery to make it survivable. It didn't need to be a
given: nothing about ChangePubKey requires a human in the loop between "the app got a successful
registration response" and "the server is signing with that key" — the server generated the key
in the first place (`registrationStore.ts` already holds the private key in-memory) and is the
only process that ever needs to use it.

**Fix — the server adopts its own registrations:** `server/src/orders.ts`'s new `adoptServerKey`
runs at the end of `submitChangePubKeyRegistration`, in the same request that confirms the
on-chain registration, and does three things before responding: (1) mutates the single `Config`
instance in place (`accountIndex`/`apiKeyIndex`/`apiKeyPrivateKey` — passed by reference into
every route handler from one `loadConfig()` call in `server.ts`, so every in-flight and future
request sees the change immediately), resetting the signing-client cache so the next signed call
builds a fresh client instead of reusing one built for the old key; (2) writes the same three
values into `server/.env.local` via a new pure `mergeEnvFile` (`server/src/envFile.ts`) that
upserts exact `KEY=value` lines while leaving every other line — comments, blank lines, the
Shield secrets sitting right next to them — byte-for-byte untouched, so a restart survives without
re-running onboarding; (3) logs one line (`adopted new trading key for account N`) and kicks off a
fresh self-test in the background to confirm the newly adopted key really is live on-chain,
resetting the shared self-test verdict first so a stale "invalid" reading from an old key doesn't
leak onto the new one. `changePubKey.ts`'s old `.env.pending` write (a durable-but-still-manual
backstop) is now fully superseded and removed — there's no gap left for it to backstop.

The private key itself now never leaves the server process at all: the `/changepubkey/submit`
response dropped the `apiKeyPrivateKey` field entirely (it used to go back so the app could print
it on screen), since the app has nothing to do with it anymore.

**Security note, in case an auditor re-flags the `.env.local` write:** this is a deliberate,
recipe-appropriate scope call, not an oversight. It's a single-operator dev tool, the file is
already gitignored, and it sits in the exact same trust domain as the Openfort Shield secrets that
already live in it — anyone who can read one can already read the other.

**UI fallout:** happy-path onboarding is now two steps, not three — fund, then sign; the server
adopts and the poll picks it up within ~2s, no "Activate the server" screen in between. In
`OnboardingStatusScreen.tsx`, the three near-duplicate cards that used to display printed
credentials (the plain "activate the server" card, the stale-key card, the account-mismatch card)
collapsed into one `needsRecovery` card that never shows key material and always offers the same
fix: tap Re-authorize, the server adopts automatically. The "Check again" button is gone
everywhere — the 2s poll already does that job. `hooks/onboardingGate.ts`'s `deriveStep` logic is
unchanged (still a pure function of account/apiKeys/serverConfig — see its test suite), only its
live reachability changed: reaching `"activateServer"` through the running app is now a genuine
anomaly (hand-edited env, a second server instance, a lost adoption after a restart) rather than
the everyday path, so it's documented as a safety net rather than removed outright — a second
server process or a corrupted env file are still real failure modes worth a recovery path.

**Tests:** `server/src/envFile.test.ts` (pure merge logic, including an explicit byte-for-byte
check that the Shield secrets survive an update untouched, plus the file I/O wrapper against a
real temp file) and `server/src/orders.test.ts` (`adoptServerKey`'s config hot-swap, persistence
call, graceful handling of a failed persistence write, signing-client re-creation, and the
stale-self-test-verdict reset — all against the real vendored WASM signer with only `fetch` and
`envFile.ts`'s I/O mocked). Did not live-verify the full flow myself — ChangePubKey needs a real L1
signature from the user's embedded wallet, which can't be forged from here; the mechanics were
verified in isolation instead, and the user's next Re-authorize tap is the actual end-to-end test.
