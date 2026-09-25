# AGENTS.md

## Project overview
- Vite + React app: log in with an Openfort embedded wallet, then deposit 0.1 USDC into a Morpho vault (ERC-4626) and redeem it again.
- Chain: **Base mainnet only** (real USDC). Vault `0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183`, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- Vault APY comes from the Morpho GraphQL API (`https://api.morpho.org/graphql`); deposits and redeems are plain contract calls through wagmi.
- Wallet recovery is passkey (client-side WebAuthn), so there is no backend.

## Setup commands
- `pnpm i`
- `cp .env.example .env` and fill in the keys
- `pnpm dev` (serves on `http://localhost:5173`)

## Environment
All variables are in `.env.example`, each with a comment.

| Variable | Required | Source |
|---|---|---|
| `VITE_OPENFORT_PUBLISHABLE_KEY` | yes | Dashboard > API keys (`pk_...`) |
| `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY` | yes | Dashboard > API keys, Shield section |
| `VITE_OPENFORT_FEE_SPONSORSHIP_ID` | no | Dashboard > Gas sponsorship on Base (`pol_...`); unset = user pays gas in ETH |
| `VITE_WALLET_CONNECT_PROJECT_ID` | no | cloud.reown.com; unset = no WalletConnect connector |

`src/utils/envValidation.ts` blocks rendering and shows a modal when a required key is missing or the publishable key does not start with `pk_`.

## Testing instructions
- `pnpm verify` runs `biome lint .` and `tsc -b && vite build`. It proves the app type-checks and bundles against the pinned SDKs. There are no unit tests.
- Manual runtime checks (need real keys and a wallet holding at least 0.1 USDC on Base): passkey login through `OpenfortButton`, wallet USDC balance, vault APY, "Supply 0.1 USDC to pool" (approve, then deposit), vault balance updates, "Withdraw all from pool" (redeem).
- Last runtime-verified: not recorded. The 2.1.3 upgrade was verified with `pnpm verify` only.
- 2026-09-25: `pnpm install` (pnpm 10.30.3, Node 22), `pnpm audit --audit-level=moderate` (0 moderate or higher; 1 low, CVE-2025-14505 in `elliptic`, ignored in `pnpm-workspace.yaml`), `pnpm verify` passed. No test script. No runtime check.

## Add this to your app
For a coding agent adding Openfort login + Morpho vault deposit/redeem to an existing React app (Vite or Next.js client components).

**Dashboard setup**
1. Create a project at https://dashboard.openfort.io and copy the publishable key (`pk_...`) and the Shield publishable key.
2. Add your app's origin (for example `http://localhost:5173`) to allowed domains.
3. Optional: create a gas sponsorship on Base mainnet and copy its ID (`pol_...`). It needs live-mode keys, since Base mainnet is not a test-mode chain.

**Install** (exact versions this recipe builds with)
```sh
pnpm add @openfort/react@2.1.3 wagmi@^3.6.20 viem@^2.52.2 @tanstack/react-query@^5.101.1 \
  graphql@^16.11.0 graphql-request@^7.2.0
```
`graphql` / `graphql-request` are only for the APY read; skip them if you do not show APY.

**Files that carry the integration**
| File | Role |
|---|---|
| `src/Providers.tsx` | `QueryClientProvider` > `WagmiProvider` > `OpenfortWagmiBridge` > `OpenfortProvider` with passkey recovery and `walletConfig.ethereum.ethereumFeeSponsorshipId` |
| `src/hooks/useVaultOperations.ts` | USDC and vault-share reads, `approve` + `deposit`, `redeem` via wagmi `useWriteContract` |
| `src/hooks/useVaultApy.ts` | Vault net APY from the Morpho GraphQL API |
| `src/App.tsx` | `OpenfortButton`, `useUser().isAuthenticated`, wiring |

**Steps**
1. Wrap the app in the provider stack from `src/Providers.tsx`. `OpenfortWagmiBridge` goes inside `WagmiProvider`, and `OpenfortProvider` inside the bridge. Put `embeddedWalletConnector()` first in the wagmi connectors and use `base` as the chain.
2. Render `<OpenfortButton />` for login and the wallet panel; gate the vault actions on `useUser().isAuthenticated`.
3. Copy `useVaultOperations.ts`: read `balanceOf` on USDC and the vault, `convertToAssets(shares)` for the position; deposit = `approve(vault, amount)` then `deposit(amount, receiver)`; withdraw = `redeem(shares, receiver, owner)`. Wait for each receipt with `publicClient.waitForTransactionReceipt`.
4. Swap `VAULT_ADDRESS` for the vault you want (any ERC-4626 Morpho vault on the same chain).

**Check it works**: log in, send 0.1 USDC on Base to the wallet, supply, and the vault balance card shows about 0.1 USDC. With a fee sponsorship set, the wallet needs no ETH.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
|---|---|---|---|
| `OpenfortProvider` (`publishableKey`, `walletConfig.shieldPublishableKey`) | `src/Providers.tsx` | Publishable key + Shield publishable key | [React quickstart](https://www.openfort.io/docs/products/embedded-wallet/react/quickstart/passkey) |
| `uiConfig.walletRecovery.defaultMethod = RecoveryMethod.PASSKEY` | `src/Providers.tsx` | none (client-side WebAuthn) | [Recovery methods](https://www.openfort.io/docs/configuration/recovery-methods) |
| `walletConfig.ethereum.ethereumFeeSponsorshipId` | `src/Providers.tsx` | Gas sponsorship on Base | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `OpenfortWagmiBridge`, `embeddedWalletConnector` (`@openfort/react/wagmi`) | `src/Providers.tsx` | none | [Ethereum wallets](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `OpenfortButton` | `src/App.tsx` | none | [UI components](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `useUser` | `src/App.tsx` | none | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser) |
| Allowed domains | n/a | App origin listed | [Allowed domains](https://www.openfort.io/docs/configuration/allowed-domains) |
| Publishable / Shield keys | `.env` | API keys page | [API keys](https://www.openfort.io/docs/configuration/api-keys) |

## Failure modes
| Error | Cause | Fix |
|---|---|---|
| Blank page in `vite dev`, provider chunk fails to load | `@openfort/react` before 1.1.1 marked its lazy imports `@vite-ignore`, so Vite resolved them against `node_modules/.vite/deps` | Use `@openfort/react` 1.1.1 or later (2.1.3 has no `@vite-ignore`; no patch needed) |
| `Openfort publishable key should start with "pk_"` | `VITE_OPENFORT_PUBLISHABLE_KEY` holds a secret or Shield key | Use the project publishable key |
| `Rate limit exceeded. Please wait a moment and try again.` | The Base RPC rejected the redeem with a rate-limit error | Retry, or pass a dedicated RPC URL to `http()` in `src/Providers.tsx` |
| `Insufficient gas or funds for withdrawal transaction.` | No fee sponsorship and no ETH on Base for gas | Set `VITE_OPENFORT_FEE_SPONSORSHIP_ID` or fund the wallet with ETH |
| `Deposit failed: ...` | Approve or deposit reverted or was rejected; the wagmi error message follows | Read the message; check USDC balance (0.1 minimum) and sponsorship |
| Supply button does nothing | `handleSupply` returns early when the USDC balance is under 0.1 | Fund the wallet with at least 0.1 USDC on Base |

## Upgrade notes
- `@openfort/react` 2.0.1 -> 2.1.3 (2026-09): no API changes needed here. 2.1.3 fixes a login that asked for the passkey twice. The fee sponsorship key stays `walletConfig.ethereum.ethereumFeeSponsorshipId`.
- `@solana/*` packages in `package.json` are optional peers of `@openfort/react`; this recipe is EVM-only. The Vite build logs `Module "crypto" has been externalized for browser compatibility` from `@solana/kora`; it is harmless for this EVM flow.
- Linting is **Biome** (`files.includes` + `css.parser.tailwindDirectives`) on **Vite 8**; Tailwind stays on v3.

## Code style
- Vite + TypeScript, **Biome** for lint/format (`pnpm lint` / `pnpm check`): single quotes, no semicolons, 2-space, 120 col.
- Follow the existing Tailwind + hooks patterns; keep components focused and hooks reusable.

## PR instructions
- Title format: `[morpho] <summary>`.
- Run `pnpm verify` before requesting review.
- Document new env vars or vault constants in `README.md` and here.
