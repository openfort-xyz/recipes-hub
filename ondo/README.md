# Trade tokenized stocks with Ondo

Buy and sell [Ondo Global Markets](https://ondo.finance/global-markets) tokenized stocks and ETFs (NVDAon, TSLAon, AAPLon, SPYon, QQQon) with USDC from an Openfort Solana embedded wallet. Trades are routed by [Jupiter](https://jup.ag) on Solana mainnet; the embedded wallet signs every swap. No backend.

> **Eligibility.** Ondo Global Markets tokens are not offered to U.S. persons or to anyone in a prohibited jurisdiction, and are limited to qualified or professional investors in several others. See [Ondo's eligibility rules](https://docs.ondo.finance/ondo-stocks/eligibility). This sample shows a notice and a self-attestation; a production app must run its own KYC and geo-blocking.

## Quick start

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/ondo openfort-ondo && cd openfort-ondo
pnpm i
cp .env.example .env   # add your Openfort publishable + Shield publishable keys
pnpm dev               # http://localhost:5190
```

Fund the wallet with a little **SOL** (network fees and token-account rent) and **USDC** on Solana mainnet, then buy.

## How it works

1. `GET https://lite-api.jup.ag/swap/v1/quote` with `inputMint` USDC and `outputMint` the Ondo token (swap them to sell).
2. `POST https://lite-api.jup.ag/swap/v1/swap` with the quote and the wallet address returns an unsigned, base64 transaction.
3. `useSolanaEmbeddedWallet().provider.signTransaction` signs it; `@solana/kit` sends it and waits for confirmation.

See [`AGENTS.md`](./AGENTS.md) for the files to copy into your own app, the Openfort primitives used, and known failure modes.
