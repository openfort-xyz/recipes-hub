# Vendored Lighter WASM signer

`lighter-signer.wasm` and `wasm_exec.js` are built from the **official**
[`elliottech/lighter-go`](https://github.com/elliottech/lighter-go) repository — there is no
official TypeScript SDK for Lighter (open proposal: `elliottech/lighter-python#49`), so this
recipe vendors a WASM build of the canonical Go signer instead of depending on an unofficial
community wrapper.

## Provenance

- Source repo: https://github.com/elliottech/lighter-go
- Commit: `c26ac340ce5d2e237c555949b6ab0927bd09e0df` (2026-06-08)
- Build command (from repo root, matches the `build-wasm` target in the repo's `justfile`):
  ```
  go mod vendor
  GOOS=js GOARCH=wasm go build -trimpath -o ./build/lighter-signer.wasm ./wasm/
  ```
- `wasm_exec.js` is the Go runtime's WASM glue file, copied verbatim from the Go toolchain that
  built the binary (`$(go env GOROOT)/lib/wasm/wasm_exec.js`, Go 1.26.5). It must match the Go
  major version used to build the `.wasm` file — if you rebuild with a different Go version,
  re-copy this file too.

## What it exposes

`wasm/main.go` in `lighter-go` registers global JS functions on `globalThis` once the module is
instantiated and run (see `signer.ts` in this directory for the Node wrapper). The ones this
recipe uses:

- `GenerateAPIKey()` — generates a Poseidon/Schnorr API keypair (NOT an EVM key).
- `CreateClient(url, privateKey, chainId, apiKeyIndex, accountIndex)` — registers an in-memory
  signer client keyed by `(accountIndex, apiKeyIndex)`.
- `SignChangePubKey(pubKeyHex, skipNonce, nonce, apiKeyIndex, accountIndex)` — builds and signs
  the ChangePubKey (API key registration) transaction, and returns `messageToSign`: the exact
  plain-text message the account's L1 (EVM) wallet must `personal_sign`.
- `SignCreateOrder(...)`, `SignCancelOrder(...)`, `SignCancelAllOrders(...)` — build and sign
  trading transactions with the registered API key.
- `CreateAuthToken(deadline, apiKeyIndex, accountIndex)` — signs a bearer token for authenticated
  read endpoints.

All signing happens entirely inside the WASM sandbox; private key material never leaves the Go
runtime's memory as a JS value except as the hex string returned by `GenerateAPIKey`.

## Why WASM over a community SDK

We evaluated the community TypeScript wrappers (`lighter-ts-sdk`, `@reservoir0x/lighter-ts-sdk`,
`@specialjp/lighter-sdk`, `lighter-node-client`) but all of them either wrap this same WASM build
with an unknown/stale commit pin, or use native FFI bindings (Node-only, no clear provenance,
harder to audit). Vendoring the official Go source ourselves means we know exactly which commit
produced the binary, and it stays server-side only (never shipped to the mobile app bundle).

## Verification

Signature outputs were validated two ways (see `../FRICTION_LOG.md` for the full trace):

1. The vendored build reproduces every assertion in `lighter-go`'s own
   `examples/wasm/test_wasm.mjs` fixture (deterministic Poseidon signatures for CreateOrder,
   CancelOrder, CancelAllOrders, CreateSubAccount, UpdateLeverage, CreateGroupedOrders).
2. A live `POST /api/v1/sendTx` against mainnet with a well-formed-but-unregistered-key signature
   passed the server's Poseidon-Schnorr signature check (distinct `21120 invalid signature`
   error for a deliberately corrupted signature vs. a generic `29500 internal server error` for
   our validly-signed-but-unauthorized transaction) — proof the wire format is correct even
   without a funded/registered account to test against end-to-end.
