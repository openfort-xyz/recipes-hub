# End-to-end verification (requires a funded mainnet wallet)

Everything in this recipe was verified against live mainnet endpoints (account lookup, order
book, `nextNonce`, `sendTx` signature validation — see `FRICTION_LOG.md`) but never end-to-end
with a real funded account, because doing so would move real ETH and USDC. This is the exact,
step-by-step checklist for the first human (or agent with wallet-funding authority) to close that
gap.

Budget roughly **10-15 USDC and 0.01-0.02 ETH** for gas across the full flow (deposit approve +
deposit + a couple of test orders + a withdrawal). Use small amounts — this is a recipe, not a
production trading terminal.

## 0. Prerequisites

- [ ] `server/.env.local` has `OPENFORT_SECRET_KEY`, `SHIELD_PUBLISHABLE_KEY`,
      `SHIELD_SECRET_KEY`, `SHIELD_ENCRYPTION_SHARE` filled in (Openfort dashboard → Shield).
- [ ] `server` running: `cd server && npm run dev` — confirm `curl localhost:3008/api/health`
      returns `{"status":"ok",...}`.
- [ ] App `.env.local` has `OPENFORT_PUBLISHABLE_KEY`, `SHIELD_PUBLISHABLE_KEY`, and both URL vars
      pointing at the running server.
- [ ] App running on a simulator/device with the server reachable (use `--tunnel` or your
      machine's LAN IP if testing on a physical device, not `localhost`).

## 1. Log in and create the embedded wallet

1. Launch the app, tap **Continue as Guest** (fastest path — no OAuth setup needed).
2. The app should auto-create an embedded wallet and land on the "Set up your account" screen.
3. **Verify**: `GET /api/lighter/account?l1Address=<your address>` from the app's network logs
   (or curl it directly) returns `{"onboarded": false, "account": null, "apiKeys": []}` — a real
   response from mainnet, not a mock.

## 2. Fund the wallet

1. Copy the embedded wallet's address (shown on the "Wallet ready" screen if creation succeeds).
2. Send **~10 USDC** and **~0.01 ETH** (for gas) to that address on Ethereum mainnet from an
   exchange or another wallet.
3. Wait for confirmations (a couple minutes is plenty).

## 3. Deposit

1. On the "Fund your account" step, enter an amount (e.g. `5`) and tap **Deposit**.
2. The app will send an `approve` transaction (if allowance is insufficient) followed by a
   `deposit` transaction — both are real mainnet transactions, confirm each in your wallet's
   activity/Etherscan.
3. **Verify**: the `deposit` tx's `to` address is
   `0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7` and it emits a `Deposit` event.
4. Lighter typically credits deposits within a few minutes. Pull-to-refresh (or wait for the
   8-second poll) until the step advances to "Authorize trading" — this confirms
   `GET /api/lighter/account` now returns a non-null `account` with an assigned `index`.

## 4. Authorize trading (ChangePubKey)

1. Tap **Sign & authorize**. Openfort will prompt a `personal_sign` — the message should read
   `Register Lighter Account\n\npubkey: 0x...\n...` (see `docs/lighter-signing-notes.md` for the
   exact template). **Verify the message is plain text, not a hex blob or typed-data JSON** — if
   it looks different, something upstream changed and this recipe needs revisiting.
2. On success, the app moves to "Activate the server" and shows three lines
   (`LIGHTER_ACCOUNT_INDEX=`, `LIGHTER_API_KEY_INDEX=`, `LIGHTER_API_KEY_PRIVATE_KEY=`) — the
   same values the server printed to its own console.
3. **Verify on mainnet**: `GET /api/v1/apikeys?account_index=<n>` against
   `https://mainnet.zklighter.elliot.ai` should now list the new key's public key at the expected
   `api_key_index`.

## 5. Activate the server

1. Copy the three lines into `server/.env.local`, replacing the empty placeholders.
2. Restart the server (`Ctrl-C`, `npm run dev` again).
3. Back in the app, tap **Check again**. `GET /api/lighter/config` should now report
   `"serverWalletConfigured": true`, and the app should advance to the trading screen.

## 6. Place a small order

1. On the trading screen, note the live ETH mid price and order book.
2. Tap **Buy**, enter a small amount (e.g. `$15`, comfortably above the ~$9 minimum at current
   ETH prices — the app will reject anything below the market's `min_base_amount`), review, and
   confirm.
3. This submits an Immediate-or-Cancel marketable limit order (crosses the spread by 0.5%).
   **Verify**: the response includes a `txHash`; the order either fills immediately (check
   your Lighter position/balance) or shows a clear failure reason in the app (not a crash).
4. Repeat with **Sell** for a small amount to confirm both directions work.

## 7. Cancel an order (GTC path, optional)

The default buy/sell flow uses IOC orders, which don't rest on the book. To exercise the cancel
path, you'd need to place a GTC order (not exposed in the current UI — a good follow-up). At
minimum, confirm `POST /api/lighter/order/cancel` with a nonexistent `orderIndex` returns a clean
error rather than a crash (already covered by the graceful-degradation design, but worth a spot
check against live mainnet).

## 8. Withdraw

1. From the trading screen, tap **Withdraw**, enter an amount (≥ 1 USDC), confirm.
2. **Verify**: funds arrive back at the SAME wallet address you started with — Lighter's withdraw
   transaction carries no destination parameter, so there's no way to test (or accidentally
   trigger) sending funds elsewhere.

## What "done" looks like

- [ ] Deposit tx confirmed on Etherscan, account appears via `GET /api/v1/account?by=index`
- [ ] API key appears via `GET /api/v1/apikeys`
- [ ] At least one buy and one sell order both return a `txHash` and are reflected in account
      balance/positions
- [ ] Withdrawal confirmed back at the original wallet address
- [ ] Any deviation from this doc (different message format, different error shape, etc.)
      recorded as a new dated entry in `FRICTION_LOG.md`
