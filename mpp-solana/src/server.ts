import express from 'express'
import { payment } from 'mppx/express'
import { config } from './config.js'
import { mpp } from './mpp.js'

const app = express()

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// Gate the resource behind an MPP charge. Unpaid requests get a 402 with a
// `WWW-Authenticate: Payment` challenge; paid requests reach the handler and
// receive a `Payment-Receipt` header.
app.get(
  '/api/protected',
  payment(mpp.charge, { amount: config.priceBaseUnits, currency: config.currency }),
  (_req, res) => {
    res.json({
      secret: 'You paid for this resource over MPP on Solana.',
      issuedAt: new Date().toISOString(),
    })
  },
)

app.listen(config.port, () => {
  console.log(`MPP server listening on http://localhost:${config.port}`)
  console.log(
    `Protected resource: GET /api/protected — ${config.priceBaseUnits} base units of ${config.currency} on ${config.network}`,
  )
})
