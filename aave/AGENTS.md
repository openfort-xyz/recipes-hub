# AGENTS.md

## Project overview
- Vite + React app: log in with an Openfort embedded wallet, then supply 0.1 USDC to Aave and withdraw it again.
- Chains: Base mainnet (default) and Base Sepolia. Reserves are discovered on whichever chain the wallet is connected to.
- Uses the Aave **v4** SDK (`@aave/react` 6.x, hub/spoke model).
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
| `VITE_OPENFORT_FEE_SPONSORSHIP_ID` | no | Dashboard > Gas sponsorship (`pol_...`); unset = user pays gas |
| `VITE_WALLET_CONNECT_PROJECT_ID` | no | cloud.reown.com; unset = no WalletConnect connector |

`src/utils/envValidation.ts` blocks rendering and shows a modal when a required key is missing or the publishable key does not start with `pk_`.

## Testing instructions
- `pnpm verify` runs `biome lint .` and `tsc -b && vite build`. It proves the app type-checks and bundles against the pinned SDKs. There are no unit tests.
- Manual runtime checks (need real keys and a wallet funded with USDC on Base or Base Sepolia): passkey login through `OpenfortButton`, USDC balance shown, "Supply 0.1 USDC to pool" (approval or permit, then supply), position and APY shown, "Withdraw all from pool".
- Last runtime-verified: not recorded. The 2.1.3 upgrade was verified with `pnpm verify` only.
- 2026-09-25: `pnpm install` (pnpm 10.30.3, Node 22), `pnpm audit --audit-level=moderate` clean after overriding `@walletconnect/utils` 2.21.0-2.21.8 to 2.21.10 (same minor; 2.21.9+ dropped `query-string`, which pulled vulnerable `decode-uri-component`, GHSA-vcc3-ghjq-m6fr, via `@aave/client` > `thirdweb`). Do not override `decode-uri-component` to 0.5.0 instead: it is ESM-only and breaks `query-string@7` (CJS) at runtime. `pnpm verify` passed. No test script. Runtime flows not re-verified.

## Add this to your app
For a coding agent adding Openfort login + Aave supply/withdraw to an existing React app (Vite or Next.js client components).

**Dashboard setup**
1. Create a project at https://dashboard.openfort.io and copy the publishable key (`pk_...`) and the Shield publishable key.
2. Add your app's origin (for example `http://localhost:5173`) to allowed domains.
3. Optional: create a gas sponsorship for Base / Base Sepolia and copy its ID (`pol_...`).

**Install** (exact versions this recipe builds with)
```sh
pnpm add @openfort/react@2.1.3 wagmi@^3.6.20 viem@^2.52.2 @tanstack/react-query@^5.101.1 \
  @aave/react@^6.1.0 @aave/client@^6.1.0 @aave/graphql@^3.0.1
```

**Files that carry the integration**
| File | Role |
|---|---|
| `src/Providers.tsx` | `QueryClientProvider` > `WagmiProvider` > `OpenfortWagmiBridge` > `AaveProvider` > `OpenfortProvider` with passkey recovery and `walletConfig.ethereum.ethereumFeeSponsorshipId` |
| `src/lib/aave.ts` | `AaveClient.create()` |
| `src/hooks/useAaveOperations.ts` | `useSupply` / `useWithdraw` with an execution-plan handler that sends each step through the wagmi wallet client |
| `src/hooks/useAaveSupplies.ts` | `useUserSupplies` for the user's positions |
| `src/App.tsx` | `useReserves` to find the USDC reserve, USDC `balanceOf`, wiring |

**Steps**
1. Wrap the app in the provider stack from `src/Providers.tsx`. Order matters: `OpenfortWagmiBridge` goes inside `WagmiProvider`, and `OpenfortProvider` inside the bridge. Put `embeddedWalletConnector()` first in the wagmi connectors.
2. Render `<OpenfortButton />` for login and the wallet panel. Read login state with `useUser().isAuthenticated` and the address with wagmi `useAccount()`.
3. Find the reserve: `useReserves({ query: { chainIds: [chainId(id)] }, user })`, then match `reserve.asset.underlying.info.symbol`. Supply/withdraw take `reserve.id`.
4. Copy the plan handler from `useAaveOperations.ts`: `TransactionRequest` and `PreContractActionRequired` go through `useSendTransaction(walletClient)`, `Erc20Approval` uses `.bySignature` (sign typed data) or `.byTransaction`.
5. Call `supply({ reserve, amount: { erc20: { value: bigDecimal(0.1) } }, sender })` and `withdraw({ reserve, amount: { erc20: { max: true } }, sender })`; both return a `Result`, check `isErr()`.

**Check it works**: log in, fund the wallet with USDC, supply, wait for the receipt, and the position from `useUserSupplies` appears. With a fee sponsorship set, the wallet needs no ETH.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
|---|---|---|---|
| `OpenfortProvider` (`publishableKey`, `walletConfig.shieldPublishableKey`) | `src/Providers.tsx` | Publishable key + Shield publishable key | [React quickstart](https://www.openfort.io/docs/products/embedded-wallet/react/quickstart/passkey) |
| `uiConfig.walletRecovery.defaultMethod = RecoveryMethod.PASSKEY` | `src/Providers.tsx` | none (client-side WebAuthn) | [Recovery methods](https://www.openfort.io/docs/configuration/recovery-methods) |
| `walletConfig.ethereum.ethereumFeeSponsorshipId` | `src/Providers.tsx` | Gas sponsorship on Base / Base Sepolia | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `OpenfortWagmiBridge`, `embeddedWalletConnector` (`@openfort/react/wagmi`) | `src/Providers.tsx` | none | [Ethereum wallets](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `OpenfortButton` | `src/components/ActionButtons.tsx` | none | [UI components](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `useUser` | `src/App.tsx` | none | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser) |
| Allowed domains | n/a | App origin listed | [Allowed domains](https://www.openfort.io/docs/configuration/allowed-domains) |
| Publishable / Shield keys | `.env` | API keys page | [API keys](https://www.openfort.io/docs/configuration/api-keys) |

## Failure modes
| Error | Cause | Fix |
|---|---|---|
| Blank page in `vite dev`, provider chunk fails to load | `@openfort/react` before 1.1.1 marked its lazy imports `@vite-ignore`, so Vite resolved them against `node_modules/.vite/deps` | Use `@openfort/react` 1.1.1 or later (2.1.3 has no `@vite-ignore`; no patch needed) |
| `Openfort publishable key should start with "pk_"` | `VITE_OPENFORT_PUBLISHABLE_KEY` holds a secret or Shield key | Use the project publishable key |
| `Supply cap reached` (button) / `The USDC supply cap for this market is full.` | `reserve.canSupply` is false on the connected chain | Switch to Base mainnet or wait for capacity |
| `Insufficient balance. You need at least 0.1 USDC to supply to the pool.` | Wallet holds under 0.1 USDC | Fund the wallet with USDC on the connected chain |
| `[GraphQL] Bad user input - ...` | Aave API rejected the supply/withdraw request | The text after `- ` is shown in the UI; fix the input it names |
| Unhandled rejection with `name === 'InvariantError'` | Thrown internally by the Aave SDK | `src/main.tsx` suppresses it; nothing to fix in app code |

## Upgrade notes
- Aave v4: there is no `useAaveMarkets`. Discover reserves with `useReserves`; the underlying token is at `reserve.asset.underlying.info`, supply APY at `reserve.asset.summary.supplyApy.value`, the supply gate at `reserve.canSupply`. Positions come from `useUserSupplies` (auto-refreshing, no manual refetch); balance at `position.balance.amount.value`.
- `@openfort/react` 2.0.1 -> 2.1.3 (2026-09): no API changes needed here. 2.1.3 fixes a login that asked for the passkey twice. The fee sponsorship key stays `walletConfig.ethereum.ethereumFeeSponsorshipId`.
- `@solana/*` packages in `package.json` are optional peers of `@openfort/react`; this recipe is EVM-only.

## Code style
- Vite + TypeScript, **Biome** for lint/format (`pnpm lint` / `pnpm check`): single quotes, no semicolons, 2-space, 120 col.
- Functional components and hooks; wallet state comes from wagmi and `@openfort/react` hooks.
- `@tanstack/react-query` is a peer used by wagmi and `@aave/react`; app code does not call it directly.

## PR instructions
- Title format: `[aave] <summary>`.
- Run `pnpm verify` before requesting review.
- Document new env vars or contract addresses in `README.md` and here.
