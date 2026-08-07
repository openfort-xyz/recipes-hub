# Lighter signing ground truth

Precise findings on the two facts that determine where Openfort's embedded wallet plugs into the
Lighter integration: what account creation requires, and how ChangePubKey (API key registration)
is authorized. Both are sourced from `lighter-go` source code (commit
`c26ac340ce5d2e237c555949b6ab0927bd09e0df`), not docs — see the "why not docs" note at the bottom.

## 1. Account creation

**Source:** `apidocs.lighter.xyz/docs/create-accounts-programmatically.md` +
`apidocs.lighter.xyz/docs/get-started.md`.

There is no separate "create account" transaction type in `lighter-go` (searched
`types/txtypes/*.go` — the only account-adjacent tx type is `create_sub_account.go`, which
presupposes a master account already exists). The docs state directly: *"To create a Lighter
account, you can simply deposit some assets to Lighter."* The flow is:

1. The EVM wallet calls `approve` (for ERC-20 assets) then `deposit` on the L1 contract
   (mainnet: `0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7`, method selector `0x8a857083`), or sends
   a CCTP-routed USDC transfer from Arbitrum/Base/Avalanche (5 USDC minimum, ~15-20 min credit
   time; direct mainnet deposits use a 1 USDC minimum).
2. Lighter's indexer credits the deposit and assigns a fresh `account_index`. No signature beyond
   the L1 deposit transaction itself is required — the deposit *is* the registration.
3. The app looks up the assigned `account_index` via `GET /api/v1/account?by=l1_address&value=<addr>`
   (or `accountsByL1Address`) once the deposit has been credited.

**What this means for the Openfort integration:** account creation needs the embedded wallet to
sign and broadcast a normal EVM transaction (ERC-20 `approve` + contract `deposit`, or a plain
USDC transfer for the CCTP path) — the same `wallet.sendTransaction` / `wallet.getProvider()`
pattern used elsewhere in this recipes-hub, not a
message-signing flow. There is nothing to wire into Shield/embedded-wallet message signing for
this step specifically.

## 2. ChangePubKey (API key registration) authorization

**Source:** `types/txtypes/change_pub_key.go:78-90` and `types/txtypes/utils.go:19-20,66-84` in
`lighter-go`.

`change_pub_key.go` defines:

```go
func (txInfo *L2ChangePubKeyTxInfo) GetL1SignatureBody() string {
    signatureBody := fmt.Sprintf(
        TemplateChangePubKey,
        common.Bytes2Hex(txInfo.PubKey),
        getHex10FromUint64(uint64(txInfo.Nonce)),
        getHex10FromUint64(uint64(txInfo.AccountIndex)),
        getHex10FromUint64(uint64(txInfo.ApiKeyIndex)),
    )
    return signatureBody
}

func (txInfo *L2ChangePubKeyTxInfo) GetL1AddressBySignature() common.Address {
    return calculateL1AddressBySignature(txInfo.GetL1SignatureBody(), txInfo.L1Sig)
}
```

`utils.go` defines the template and how the L1 signature is verified:

```go
const TemplateChangePubKey = "Register Lighter Account\n\npubkey: 0x%s\nnonce: %s\naccount index: %s\napi key index: %s\nOnly sign this message for a trusted client!"

func calculateL1AddressBySignature(signatureBody, l1Signature string) common.Address {
    message := accounts.TextHash([]byte(signatureBody))
    // ... crypto.SigToPub(message, signatureContent) ...
}
```

`accounts.TextHash` is go-ethereum's implementation of the standard **EIP-191 `personal_sign`**
prefix (`"\x19Ethereum Signed Message:\n" + len(message) + message`). This is definitive: **the
L1 wallet authorizes ChangePubKey via plain `personal_sign`, not EIP-712 typed data.**

We reproduced this end-to-end with the vendored WASM signer (see `server/signer/README.md`):
calling `SignChangePubKey(pubKeyHex, skipNonce, nonce, apiKeyIndex, accountIndex)` returns a
`messageToSign` field containing exactly this rendered template, e.g.:

```
Register Lighter Account

pubkey: 0x59a72f108a6789a119eaf8446d6a523d84ce409d5922a004bd3c7be2b5600031f2103d8d7da0bec3
nonce: 0x0000000000000005
account index: 0x0000000000000001
api key index: 0x0000000000000002
Only sign this message for a trusted client!
```

**What this means for the Openfort integration:** the embedded wallet only needs
`wallet.signMessage(messageToSign)` (a plain personal-sign call — `@openfort/react-native`
exposes this directly) to authorize ChangePubKey. No EIP-712 domain/types wiring needed. The
resulting `L1Sig` hex string is attached to the `ChangePubKeyReq` sent to the server, which then
also applies the L2 Poseidon-Schnorr signature from the (server-held) API key before submitting to
`/api/v1/sendTx`.

Two other tx types also carry an `L1SignatureBody` (found via `rg -n GetL1SignatureBody`):
`L2TransferTxInfo` and `L2ApproveIntegratorTxInfo`, using the `TemplateTransfer` and
`TemplateL2ApproveIntegrator` templates respectively — same `personal_sign` mechanism, just
different message text. Not used by this recipe. Withdrawals, by contrast, use `L2WithdrawTxInfo`
(`types/txtypes/withdraw.go`), which has NO `L1SignatureBody` and no destination-address field at
all — Lighter's server routes withdrawals exclusively to the account's own registered L1 address,
so the server's API key alone is sufficient authorization (see `server/src/orders.ts#submitWithdraw`,
which signs and submits it as a normal L2 `sendTx`, same as an order — not an L1 contract call).

**ChangePubKey rotates, it doesn't reprint.** Submitting it a second time for the same
`(accountIndex, apiKeyIndex)` installs a brand new keypair at that slot — it isn't idempotent and
there's no "show me the currently-active key again" call. Whatever the server was holding from an
earlier submit stops being recognized on-chain the moment a later one confirms, with no error or
warning at submit time — the only symptom is every subsequent order failing
`21120 invalid signature`.

The vendored WASM has one function relevant to detecting this that this recipe doesn't use:
`CheckClient(apiKeyIndex, accountIndex)` (found by enumerating every JS global the compiled
binary actually registers — it isn't mentioned in `server/signer/README.md`'s list, which only
covers the ones already in use). Unlike every other exported function, `CheckClient` makes a real
network call *from inside the Go/WASM sandbox* (`GET /api/v1/apikeys?account_index=`) rather than
delegating to JS's `fetch`, and that call fails under Node with a DNS resolution error —
`wasm_exec.js` is Go's browser-oriented glue file, and whatever `net.Dial` shim `CheckClient`
needs for outbound requests isn't present in a Node environment. Confirmed this is inherent to the
WASM build, not a sandbox/permissions issue in this environment specifically (same failure with
sandboxing disabled). Key-validity self-testing in this recipe instead submits a real, harmless
transaction through the normal JS-side `fetch` path and checks for the `21120` code directly — see
`server/src/keySelfTest.ts`.

## 3. Testnet vs mainnet

Confirmed live and from source, not apidocs.lighter.xyz (which has zero testnet mentions across
every page checked):

| | testnet (default) | mainnet |
|---|---|---|
| API base URL | `https://testnet.zklighter.elliot.ai` | `https://mainnet.zklighter.elliot.ai` |
| L2 signing domain (`chainId`) | `300` | `304` |
| Account creation + funding | `GET /api/v1/faucet?l1_address=<addr>` — one unauthenticated REST call both creates AND credits the account (verified live: instantly credited 10,000+ USDC margin, ETH, LIT to a fresh address). No wallet signature or on-chain tx. | Real deposit: `approve` + `deposit(address,uint16,uint8,uint256)` on the L1 contract (see §1) |
| ChangePubKey | Identical mechanism and message template — the template text has no chain id embedded in it, only the underlying Poseidon signature's domain differs | same |

Sourced: the L2 signing domain values come from the official Python SDK,
`lighter/endpoint_profiles.py` (`TESTNET.chain_id = 300`, `MAINNET.chain_id = 304`, plus
`ROBINHOOD.chain_id = 466324` and `ROBINHOOD_TESTNET.chain_id = 300` for completeness), and
independently corroborated by a commented-out constant in `lighter-go`'s own
`wasm/main.go:21` (`//var chainId uint32 = 300 // testnet`). Verified end-to-end live: signed a
cancel-order tx with `chainId=300` against a real faucet-funded testnet account and got a
specific semantic error (`21109 "api key not found"`) rather than a signature-format rejection,
confirming the domain value is correct.

The faucet endpoint itself (`/api/v1/faucet`) is undocumented anywhere on apidocs.lighter.xyz —
found by noticing `GET /api/v1/faucet` (no params) returns HTTP 400 "invalid param" rather than
404, which suggested the endpoint exists and just wants a parameter; `?l1_address=` was the guess
that worked. `GET /api/v1/layer1BasicInfo` (also undocumented) additionally confirms it exists via
a `FaucetContract` address in `contract_addresses`, alongside testnet's `ZkLighterContract` and
`USDCContract` — but the faucet REST call is the actually-usable path; testnet's L1 side reports a
custom `chainId 123456` with no discoverable public RPC (it collides with an unrelated public
chain, "ADIL Devnet"), so the on-chain deposit flow isn't reachable on
testnet even if you wanted to exercise it directly.

`GET /api/v1/deposit/networks` on testnet lists Base/Arbitrum One/Avalanche C-Chain using their
MAINNET chain ids (8453/42161/43114, not the corresponding Sepolia/testnet ids) — almost certainly
a config artifact on Lighter's side rather than a real CCTP-testnet integration; not something
this recipe builds against.

## Why source, not docs

`apidocs.lighter.xyz`'s "API keys" and "Create accounts programmatically" pages describe the
*what* (ChangePubKey registers a key; depositing creates an account) but never state the *how* of
the signature mechanism — no mention of `personal_sign` vs EIP-712, no message template. Both
pages point to the SDKs "for implementation details" without embedding them. We verified this by
fetching both pages directly (2026-07-10) before falling back to source.
