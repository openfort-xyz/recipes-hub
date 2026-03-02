# Plan: Resolve x402.org Facilitator Errors

## Current situation

- **Our backend** sends verify/settle to `https://x402.org/facilitator` with:
  - `x402Version: 2`, `paymentPayload` (with `accepted`, `payload.authorization` including `value` + `amount`), `paymentRequirements`, `requirements`.
  - CAIP-2 networks, `scheme: "exact"`, all required fields present.
- **Observed errors from x402.org** (in order):
  1. `Cannot read properties of undefined (reading 'scheme')` → fixed by sending `requirements` + `paymentRequirements`.
  2. `Cannot convert undefined to a BigInt` → we added `amount` in requirements and in `authorization`; error may persist if they read another field.

The failures look like **server-side bugs** (wrong property names or paths). We cannot see their code.

---

## Option A: Get x402.org working (recommended next)

1. **Confirm exact API contract**
   - Find official x402.org facilitator API spec or sample request/response (GitHub, docs.x402.org, or x402 npm packages).
   - Compare our request body field-by-field (names, types, nesting) and align our payload to the spec.

2. **Report upstream**
   - Open an issue on the repo that hosts the public facilitator (e.g. x402.org or coinbase/x402).
   - Include: exact request body we send (redact nothing except secrets), response status + body, and note that we send both `requirements` and `paymentRequirements` and still get BigInt/undefined errors.

3. **Temporary workaround**
   - If they expect different field names (e.g. `valid_after` vs `validAfter`), add those in our facilitator body builder in `payment.ts` until they fix or document the API.

---

## Option B: Use CDP facilitator instead

1. **Switch env**
   - Set `X402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402`.
   - Set `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` (from CDP Developer Platform).

2. **Keep current code**
   - We already send CDP-style body when using that URL and add JWT when `isCdpFacilitator(baseUrl)` is true. No code change needed.

3. **Document**
   - In README/AGENTS.md: “For production or reliable verify/settle, use CDP facilitator; x402.org is testnet and may return 500 for some requests.”

---

## Option C: Bypass facilitator (no facilitator)

1. **Disable facilitator**
   - Leave `X402_FACILITATOR_URL` empty in `.env.local`.

2. **Flow**
   - Backend will use `verifyOffChainPayment` (or on-chain tx hash) only. No call to x402.org.

3. **Trade-off**
   - No facilitator verify/settle; you rely on your own verification only.

---

## Recommended order

1. **Short term:** Try **Option B** (CDP) with real API keys to confirm end-to-end works.
2. **In parallel:** Do **Option A** (find spec, align payload, then report issue with x402.org with a minimal repro).
3. **If you only need local/test:** Use **Option C** with empty facilitator URL and your existing off-chain or on-chain verification.

---

## Files to touch (for Option A only)

- `x402/backend/src/payment.ts`: `buildFacilitatorRequirements`, and the body built in `verifyWithFacilitator` / `settleWithFacilitator` (add/rename fields to match spec once known).
- Optional: add a small script or test that POSTs a minimal verify body to x402.org and logs request/response for debugging.

## Files to touch (for Option B)

- None; only env vars.

## Files to touch (for Option C)

- None; only env (empty `X402_FACILITATOR_URL`).
