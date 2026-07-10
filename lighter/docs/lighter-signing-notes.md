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
pattern used elsewhere in this recipes-hub (see `hyperliquid/utils/transactions.ts`), not a
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
different message text. Not used by this recipe (we route transfers/withdrawals through the L1
contract's `withdraw`/`fastwithdraw`, not the L2 transfer tx type), but worth knowing the pattern
is consistent across all L1-authorized L2 tx types.

## Why source, not docs

`apidocs.lighter.xyz`'s "API keys" and "Create accounts programmatically" pages describe the
*what* (ChangePubKey registers a key; depositing creates an account) but never state the *how* of
the signature mechanism — no mention of `personal_sign` vs EIP-712, no message template. Both
pages point to the SDKs "for implementation details" without embedding them. We verified this by
fetching both pages directly (2026-07-10) before falling back to source. This gap is logged in
`../FRICTION_LOG.md`.
