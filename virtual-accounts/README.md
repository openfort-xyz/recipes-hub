# Openfort Virtual Bank Accounts

Give every user their own bank account details — a **US routing and account number** or a **European
IBAN** — and have the fiat that lands there converted to USDC and delivered to their Openfort embedded
wallet. [Noah](https://noah.com) issues the account and runs the on-ramp; Openfort holds the keys.

- **Openfort embedded EOA** — self-custodial wallet with passkey recovery on Polygon (Amoy in sandbox).
  It is the destination address bound to the bank account.
- **Noah virtual accounts** — hosted KYC, then one call issues an account on either rail: `USD` → ACH
  and domestic wire, `EUR` → SEPA. Every deposit is auto-converted and sent on-chain.
- **One switch between rails** — `FiatCurrency` is the only field that changes. The response's
  `PaymentMethodType` (`BankAch` / `BankSepa`) tells you whether `AccountNumber` is an account number or
  an IBAN, and whether `BankCode` is a routing number or a BIC.

## How the flow works

```
 User                     Backend                         Noah                      Chain
 ───────────────────────────────────────────────────────────────────────────────────────────

  sign in ───────────────▶ Openfort embedded wallet
                           (usr_… + 0xabc…)

  verify identity ───────▶ POST /v1/onboarding/{customerId} ─────▶ hosted KYC page
         ◀──────────────── HostedURL                                     │
                                  ◀──────── Customer webhook ────────────┘  Approved

  get bank details ──────▶ POST /v1/workflows/bank-deposit-to-onchain-address
         ◀──────────────── USD → BankAch  · routing number + account number
         ◀──────────────── EUR → BankSepa · BIC + IBAN

  bank transfer ─────────────────────────────▶ fiat received
                                               convert to USDC ───────────▶ wallet
                                  ◀──── FiatDeposit + Transaction webhooks
```

The Openfort user id (`usr_…`) is used verbatim as the Noah `CustomerID`, so there is no user table to
keep in sync. The Noah API key is server-only — the browser never sees it.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/virtual-accounts openfort-virtual-accounts && cd openfort-virtual-accounts
```

## 2. Get credentials

### Openfort Dashboard ([dashboard.openfort.io](https://dashboard.openfort.io))

1. **API keys** — copy the **Publishable Key** (`pk_test_...`) and **Secret Key** (`sk_test_...`).
2. **Embedded wallet keys** — copy the Shield **Publishable Key**.
3. Make sure **Polygon Amoy** and the **EOA** account type are enabled on the project.

### Noah ([business.sandbox.noah.com](https://business.sandbox.noah.com))

Sandbox registration is self-serve and free.

1. Register with your business email and log in.
2. **Configuration → API → API Keys → Create New**. Label it and copy the key — it is shown once.
   Create it **without** a request-signing public key so unsigned sandbox calls work.
3. Copy Noah's **webhook public key** for sandbox from their
   [webhook docs](https://docs.noah.com/api-concepts/webhooks/configuration/) — without it the webhook
   route rejects every delivery.

Production keys are not self-serve: see [Going to production](#going-to-production).

### A tunnel

Noah's hosted KYC redirects back to `PUBLIC_APP_URL` and rejects `http://localhost`, so expose the
frontend over HTTPS while developing:

```bash
ngrok http 5182     # or: cloudflared tunnel --url http://localhost:5182
```

## 3. Configure

```bash
cp backend/.env.local.example backend/.env.local     # Openfort + Noah keys, PUBLIC_APP_URL
cp frontend/.env.example frontend/.env               # Openfort publishable + Shield key
```

## 4. Run

```bash
cd backend  && pnpm install && pnpm dev     # http://localhost:3021
cd frontend && pnpm install && pnpm dev     # http://localhost:5182
```

Then, in the app:

1. **Sign in** with an email OTP and create the wallet with a passkey.
2. **Verify identity** — this opens Noah's hosted KYC. In sandbox you can complete it with test data;
   the page polls until Noah reports `Approved`.

   > Ask only for the currencies you can serve. `NOAH_FIAT_OPTIONS` (default `USD,EUR`) decides which
   > Noah entities the session runs: USD adds the US banking partner's agreement pages, and a customer
   > whose country that entity cannot serve fails there — a 500 or "Accounts unavailable", with no
   > customer record created. Onboarding EU customers, set `NOAH_FIAT_OPTIONS=EUR`.
3. Pick **USD · ACH** or **EUR · SEPA** and press **Get bank details**. The fields are labeled for the
   rail you chose. Issuing both is fine — they point at the same wallet.
4. **Simulate a deposit** (sandbox only). Noah runs the real conversion path and sends `USDC_TEST` to
   the wallet, so the balance moves without a real bank transfer.

## What is where

| Path | What it does |
| --- | --- |
| `backend/src/noah.ts` | The whole Noah integration: signed HTTP client, the endpoints, webhook verification, and the rail-neutral mapping |
| `backend/src/routes.ts` | Openfort-authenticated route handlers (customer, onboarding, virtual account, sandbox deposit, webhook) |
| `backend/src/openfort.ts` | Validates the user's access token; the user id becomes the Noah customer id |
| `frontend/src/screens/Dashboard.tsx` | KYC gate, currency toggle, account details, deposit simulation, USDC balance |
| `frontend/src/lib/api.ts` | Typed client for the backend, and the per-rail field labels |

## USD and EUR side by side

| | USD virtual account | EUR virtual account |
| --- | --- | --- |
| Ways to pay it | SWIFT (primary), plus ACH and Fedwire in `RelatedPaymentMethods` | SEPA credit transfer |
| `FiatCurrency` | `USD` | `EUR` |
| `PaymentMethodType` | `BankSwift`, `BankAch`, `BankFedwire` | `BankSepa` |
| `AccountNumber` | Account number (same on all three) | IBAN |
| `BankCode` | BIC on SWIFT, routing number on ACH and Fedwire | BIC |
| Fee (sandbox) | $25 SWIFT · $20 Fedwire · $2.19 ACH, each + 0.15% | 1%, €1 minimum |
| Coverage | United States | 27 European countries |
| Extra checks | Ownership verification may send microdeposits under $1 — each fires two `FiatDeposit` and two `Transaction` events | Deposits above €15,000 per transaction or €30,000 per month trigger enhanced due diligence |

USD virtual accounts require Noah's **Standard Model** KYC — the hosted flow this recipe uses.

## Going to production

1. **Contact Noah** ([business@noah.com](mailto:business@noah.com)) and complete commercial onboarding
   and KYB. Production credentials are issued by your Noah contact, not the dashboard.
2. **Enable request signing** — mandatory in production, and Noah wants to see it working first:

   ```bash
   openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-384 -out noah_private.pem
   openssl pkey -in noah_private.pem -pubout -out noah_public.pem
   ```

   Register `noah_public.pem` against an API key in the dashboard and put the private key in
   `NOAH_SIGNING_PRIVATE_KEY`. Set it in sandbox first: this recipe signs whenever the variable is
   present, so you can prove the signature before live money is involved.
3. **Flip the environment** — `NOAH_ENVIRONMENT=production` switches the base URL to `api.noah.com`,
   the token to `USDC`, and the network to `Polygon`. Set `VITE_NOAH_ENVIRONMENT=production` too, use
   `pk_live_` / `sk_live_` Openfort keys, and set the **production** webhook public key.
4. **Register the webhook** at `https://yourdomain.com/api/banking/webhooks` on the production
   dashboard, then run one real deposit end to end before opening the flow to users.

## Notes

- **Re-read account details when you display them.** The assignment is stable, but bank partners and
  account-holder names change; this recipe keeps the account in component state for the session only.
- **The webhook signature covers the raw body.** `server.ts` mounts `express.raw` on the webhook route
  before `express.json()` — parsing first breaks verification.
- **Deposits are asynchronous.** The balance updates when Noah's on-chain transfer lands, which is why
  the dashboard polls and why production apps should act on the `FiatDeposit` / `Transaction` webhooks.

## Links

- [Noah virtual accounts](https://docs.noah.com/products/bank-onramp/)
- [Noah API keys and request signing](https://docs.noah.com/api-concepts/authentication/api/)
- [Openfort embedded wallets](https://www.openfort.io/docs/products/embedded-wallet)
