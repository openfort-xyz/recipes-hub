# End-to-end verification

Two paths: **testnet** (default, free, no wallet funding needed — you can run this yourself right
now) and **mainnet** (real funds/gas, needs a human with wallet-funding authority). Both were
verified against live endpoints piece-by-piece during development (account lookup, order book,
`nextNonce`, `sendTx` signature validation, and — for testnet — the faucet call itself; see
`FRICTION_LOG.md`), but the full guest-login-through-withdrawal flow inside the actual app has not
been run start to finish by an automated agent. This is the exact checklist for whoever does that
first.

## 0. Prerequisites (both paths)

- [ ] `server/.env.local` has `OPENFORT_SECRET_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`,
      `OPENFORT_SHIELD_SECRET_KEY`, `OPENFORT_SHIELD_ENCRYPTION_KEY` filled in (Openfort dashboard → Shield).
- [ ] **Email authentication is enabled** for your Openfort project in the dashboard, if you plan
      to test the email OTP login path (guest login works regardless).
- [ ] `server` running: `cd server && pnpm dev` — confirm `curl localhost:3008/api/health` returns
      `{"status":"ok",...}`, and `curl localhost:3008/api/lighter/config` shows
      `"network":"testnet"` (or `"mainnet"` if you've switched it).
- [ ] App `.env.local` has `OPENFORT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`, and both
      URL vars pointing at the running server.
- [ ] App built and running **without** `CODE_SIGNING_ALLOWED=NO` (breaks Keychain-backed session
      storage — see `AGENTS.md`) on a simulator/device with the server reachable (use `--tunnel`
      or your machine's LAN IP if testing on a physical device, not `localhost`).

---

## Path A — Testnet (free, do this first)

### A1. Log in and create the embedded wallet

1. Launch the app. Try both auth paths at least once: tap **Continue as Guest**, and separately
   test email OTP (enter an email, tap **Send code**, enter the code from your inbox, tap
   **Verify**).
2. **Verify**: if you deliberately break something (e.g. use an invalid project key), the error
   banner shows a real message for BOTH paths — this was a real bug (see `FRICTION_LOG.md`,
   guest errors used to be silently swallowed).
3. The app should auto-create an embedded wallet and land on "Get testnet funds".
4. **Verify**: `GET /api/lighter/account?l1Address=<your address>` returns
   `{"onboarded": false, "account": null, "apiKeys": []}` — a real response from Lighter testnet.

### A2. Get testnet funds

1. Tap **Get testnet funds**. No wallet signature is requested — this is a single unauthenticated
   REST call (`POST /api/lighter/faucet` → Lighter's `GET /api/v1/faucet?l1_address=`).
2. Lighter takes a few seconds to create and credit the account. Pull-to-refresh (or wait for the
   8-second poll) until the step advances to "Authorize trading".
3. **Verify**: `GET /api/lighter/account?l1Address=<address>` now returns a non-null `account`
   with `available_balance` in the thousands (USDC) and nonzero ETH/LIT in `assets` — all
   testnet play-money, credited instantly.

### A3. Authorize trading (ChangePubKey) — identical to mainnet

1. Tap **Sign & authorize**. Openfort prompts a `personal_sign` — the message should read
   `Register Lighter Account\n\npubkey: 0x...\n...` (see `docs/lighter-signing-notes.md` for the
   exact template). **Verify it's plain text**, not a hex blob or typed-data JSON.
2. On success, the app moves to "Activate the server" and shows three lines
   (`LIGHTER_ACCOUNT_INDEX=`, `LIGHTER_API_KEY_INDEX=`, `LIGHTER_API_KEY_PRIVATE_KEY=`) — the
   same values the server printed to its own console.
3. **Verify**: `GET /api/v1/apikeys?account_index=<n>` against
   `https://testnet.zklighter.elliot.ai` lists the new key's public key at the expected
   `api_key_index`.

### A4. Activate the server

1. Copy the three lines into `server/.env.local`, replacing the empty placeholders.
2. Restart the server (`Ctrl-C`, `pnpm dev` again).
3. Back in the app, tap **Check again**. `GET /api/lighter/config` should now report
   `"serverWalletConfigured": true`, and the app should advance to the trading screen.

### A5. Place orders, cancel, withdraw

Same as mainnet steps A6-A8 below, just with testnet play-money — go do them now, then come back
here. Everything after onboarding is network-agnostic (same signer, same server routes).

---

## Path B — Mainnet (real funds, do this once testnet works)

Edit `server/.env.local`: `LIGHTER_API_BASE_URL=https://mainnet.zklighter.elliot.ai`,
`LIGHTER_CHAIN_ID=304`, restart the server. Budget roughly **10-15 USDC and 0.01-0.02 ETH** for
gas across the full flow. Use small amounts — this is a recipe, not a production trading terminal.

### B1. Log in and create the embedded wallet

Same as A1.

### B2. Fund the wallet (this is the mainnet-only step)

1. Copy the embedded wallet's address (shown on the "Wallet ready" screen).
2. Send **~10 USDC** and **~0.01 ETH** (for gas) to that address on Ethereum mainnet from an
   exchange or another wallet. Wait for confirmations (a couple minutes is plenty).
3. On the "Deposit USDC" step, enter an amount (e.g. `5`) and tap **Deposit**. The app sends an
   `approve` transaction (if allowance is insufficient) followed by a `deposit` transaction —
   both real mainnet transactions, confirm each on Etherscan.
4. **Verify**: the `deposit` tx's `to` address is `0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7`
   and it emits a `Deposit` event.
5. Lighter typically credits deposits within a few minutes. Pull-to-refresh until the step
   advances to "Authorize trading".

### B3. Authorize trading, B4. Activate the server

Same as A3/A4, against mainnet's `https://mainnet.zklighter.elliot.ai`.

### B5. Place a small order

1. On the trading screen, note the live ETH mid price and order book.
2. Tap **Buy**, enter a small amount (e.g. `$15`, comfortably above the ~$9 minimum at current
   ETH prices — the app rejects anything below the market's `min_base_amount`), review, confirm.
3. This submits an Immediate-or-Cancel marketable limit order (crosses the spread by 0.5%).
   **Verify**: the response includes a `txHash`; the order either fills immediately (check your
   Lighter position/balance) or shows a clear failure reason in the app (not a crash).
4. Repeat with **Sell** for a small amount to confirm both directions work.

### B6. Cancel an order (GTC path, optional)

The default buy/sell flow uses IOC orders, which don't rest on the book. To exercise the cancel
path, you'd need to place a GTC order (not exposed in the current UI — a good follow-up). At
minimum, confirm `POST /api/lighter/order/cancel` with a nonexistent `orderIndex` returns a clean
error rather than a crash.

### B7. Withdraw

1. From the trading screen, tap **Withdraw**, enter an amount (≥ 1 USDC), confirm.
2. **Verify**: funds arrive back at the SAME wallet address you started with — Lighter's withdraw
   transaction carries no destination parameter, so there's no way to test (or accidentally
   trigger) sending funds elsewhere.

---

## What "done" looks like

- [ ] Both auth paths (guest, email OTP) tested with a deliberate failure to confirm error banners work
- [ ] Testnet: faucet call credits the account within seconds; full flow through withdrawal works
- [ ] Mainnet: deposit tx confirmed on Etherscan, account appears via `GET /api/v1/account?by=index`
- [ ] API key appears via `GET /api/v1/apikeys` (both networks tested independently)
- [ ] At least one buy and one sell order both return a `txHash` and are reflected in account
      balance/positions (both networks)
- [ ] Withdrawal confirmed back at the original wallet address (both networks)
- [ ] Any deviation from this doc (different message format, different error shape, etc.)
      recorded as a new dated entry in `FRICTION_LOG.md`
