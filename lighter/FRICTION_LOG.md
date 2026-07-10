# Friction log — Lighter recipe

Dated entries for everything that slowed this build down: missing/wrong docs, SDK gaps, confusing
APIs, workarounds, multi-attempt problems. Severity: blocker / major / minor.

---

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

## 2026-07-10 — [minor] Go toolchain not preinstalled

`go` wasn't on the machine at all (`brew install go` needed, ~90s). Not really a Lighter-specific
issue, but worth flagging for anyone reproducing this build from scratch — the WASM vendoring
step has a hard dependency on a local Go toolchain, which is unusual for a `recipes-hub` sample
otherwise entirely TypeScript/Expo.
