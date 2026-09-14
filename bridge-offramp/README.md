# Openfort × Bridge — cash out to a bank account

Next.js app where a user moves USDC out of an Openfort embedded wallet and into
their own bank account, through [Bridge](https://apidocs.bridge.xyz) (Stripe).

Bridge issues a **liquidation address**: a permanent blockchain address tied to a
verified customer. Anything sent to it is converted and paid out to the bank
account linked behind it — ACH or wire for USD, SEPA for EUR. Create it once,
and every later cash-out is just an ERC-20 transfer the wallet already knows how
to make.

This is the mirror of the [virtual accounts](../virtual-accounts) recipe: that
one issues bank details so fiat can arrive, this one issues an address so it can
leave.

## Read this before you start

**Bridge's sandbox cannot demonstrate a payout.** It has no testnet, liquidation
addresses and transfers come back as dummy data, and no payments webhooks fire.
That splits the recipe in two:

| | Sandbox | Production |
|---|---|---|
| KYC link, customer, external account, liquidation address | Real API calls | Real API calls |
| Watching the address, converting, paying out | **Never happens** | Bridge does it |
| The drain timeline in step 5 | **Simulated by this app** | Read from Bridge |
| The USDC transfer in step 4 | Real, on Base Sepolia | Real, on Base |

Everything the simulation touches is marked `simulated: true` in the API and
labelled in the UI. It is never written to Bridge. Switch `BRIDGE_ENVIRONMENT`
to `production` and the same code reads real drains instead.

So: in sandbox you send real testnet USDC to an address that nobody is watching.
That exercises the wallet half honestly and fakes nothing about the money.

## The flow

| Step | Call | Who does it |
|---|---|---|
| Verify identity | `POST /v0/kyc_links` → hosted flow | Bridge creates the customer on approval |
| Link a bank | `POST /v0/customers/{id}/external_accounts` | Routing + account number, or IBAN + BIC |
| Get a cash-out address | `POST /v0/customers/{id}/liquidation_addresses` | Returns a permanent address |
| Cash out | ERC-20 `transfer` | The embedded wallet, gas sponsored |
| Track | `GET …/liquidation_addresses/{id}/drains` | `funds_received` → `payment_submitted` → `payment_processed` |

## Setup

```sh
pnpm install
cp .env.example .env.local   # fill in the keys below
pnpm dev                     # http://localhost:3000
```

Bridge sandbox access is **not self-serve**: email support@bridge.xyz for a
Developer Account, then generate a key with the Sandbox toggle on in
[the dashboard](https://dashboard.bridge.xyz/). Sandbox keys are `sk-test-…` and
requests go to `api.sandbox.bridge.xyz`.

The Openfort keys must all come from one project, and the fee-sponsorship policy
must be on the chain you run (84532 for Base Sepolia), or the cash-out transfer
asks the user for gas they don't have.

## Notes worth knowing

**Nothing trusts the client.** Every route handler verifies the Openfort session
token and looks the Bridge customer id up from it (`src/lib/auth.ts`). The
cash-out address is created with the user's own wallet as its return address,
and `authorizeAddress()` confirms the session actually owns that address first —
without it, one signed-in user could route another's failed payouts to
themselves.

**Idempotency keys are derived, not random.** Bridge requires an
`Idempotency-Key` on every POST; deriving it from the operation plus the Openfort
user id means a double-clicked button returns the original resource instead of
minting a second bank account.

**The return address field is named twice.** Bridge's API reference calls it
`return_instructions: { address }`; the offramp guide page still calls it
`return_address`. This recipe follows the reference.

**`chain` is always `base`, even on testnet.** Bridge has no testnet chain
values at all, so a sandbox cash-out address says `base` while the wallet is on
Base Sepolia. Harmless in sandbox — the address is dummy data — but it is the
reason the two halves of the demo name different chains.

**KYC ordering.** The customer record does not exist until Bridge approves the
KYC link, which is why the sandbox "Simulate approval" button only appears after
the hosted flow has produced a customer id — `simulate_kyc_approval` takes a
customer, and there isn't one before then. Accept the terms link before the KYC
link; Bridge won't approve without it.

**Embedded wallet only, on purpose.** `wagmi-config.ts` registers only
`embeddedWalletConnector()` rather than using `getDefaultConfig`, because the
server proves wallet ownership by listing the session's Openfort accounts. An
externally connected wallet isn't one of them, so offering "Connect Wallet"
would sign people into a flow that then refuses them.

**A bad session token resolves, it doesn't reject.** `@openfort/openfort-node`
0.12 returns `null` from `iam.getSession` for a token it can't validate, so
destructuring the result turns an ordinary expired session into a `TypeError`.
`src/lib/auth.ts` checks for it. Worth knowing if you copy an older recipe's
auth helper.

**Build stubs.** `next.config.ts` aliases eight optional peers to `false`.
`@openfort/react` 2.x reaches its Solana send path from the package entry
(`@solana/kit`, `@solana/kora`, `@solana-program/{token,system}`), and
`@openfort/react/wagmi` re-exports its defaultConnectors module, which pulls the
whole `@wagmi/connectors` barrel (`@coinbase/wallet-sdk`, the two
`@safe-global/*` packages, `@walletconnect/ethereum-provider`) even though this
recipe registers only the embedded connector. None of it is used here, and
without the stubs the webpack build fails outright. It also silences one
upstream warning from `ox`'s Tempo module, reached through viem via
`@openfort/openfort-node`.

## Layout

```
src/app/api/
  account/route.ts            the user's Bridge state + KYC status refresh
  kyc/route.ts                create the hosted KYC link
  kyc/simulate/route.ts       sandbox-only approval shortcut
  bank-accounts/route.ts      create the external account
  cash-out-address/route.ts   create the liquidation address
  drains/route.ts             cash-out history, real or simulated
src/features/bridge/
  client.ts                   server-only Bridge client (key, idempotency, errors)
  types.ts                    the API shapes this recipe uses
  drains.ts                   real vs simulated drain feed
  constants.ts                USDC addresses, rail and drain labels
  use-cash-out.ts             the whole flow as one hook
  components/                 CashOutFlow, BankAccountForm, DrainTimeline
src/lib/auth.ts               session verification and address ownership
src/lib/store.ts              data/customers.json — Openfort user id → Bridge ids
```

`data/customers.json` is a file rather than a database so you can open it and
see exactly which Bridge records belong to which user. It is gitignored.

## Verify without a bank

```sh
pnpm typecheck
pnpm lint
pnpm build
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/api/account   # 401
```

Every `/api/*` route answers 401 without a bearer token, and
`/api/cash-out-address` answers 403 when the address in the body is not owned by
the session.

## Resources

- [Bridge API docs](https://apidocs.bridge.xyz) · [Offramp with liquidation addresses](https://apidocs.bridge.xyz/get-started/guides/move-money/offramp_liquidation)
- [Openfort docs](https://www.openfort.io/docs) · [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship)
