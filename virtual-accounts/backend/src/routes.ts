import type { Request, Response } from 'express'
import type { Config } from './config.js'
import { type FiatCurrency, type NoahClient, NoahError } from './noah.js'
import { authenticate, type OpenfortClient } from './openfort.js'

const CURRENCIES: FiatCurrency[] = ['USD', 'EUR']

function parseCurrency(value: unknown): FiatCurrency | null {
  return CURRENCIES.includes(value as FiatCurrency) ? (value as FiatCurrency) : null
}

function fail(res: Response, error: unknown, fallback: string) {
  if (error instanceof NoahError) {
    console.error(`[noah] ${error.message}`, error.body)
    res.status(error.status === 404 ? 404 : 502).json({ error: fallback })
    return
  }
  console.error(`[${fallback}]`, error)
  res.status(500).json({ error: fallback })
}

export function createRoutes(config: Config, openfort: OpenfortClient, noah: NoahClient) {
  /** Wraps a handler that needs an authenticated Openfort user. */
  const withUser =
    (handler: (req: Request, res: Response, customerId: string) => Promise<void>) =>
    async (req: Request, res: Response) => {
      const customerId = await authenticate(openfort, req)
      if (!customerId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      await handler(req, res, customerId)
    }

  return {
    /** Current KYC status. `not_started` means Noah has never seen this user. */
    getCustomer: withUser(async (_req, res, customerId) => {
      try {
        res.json({ status: (await noah.getCustomer(customerId)) ?? 'not_started' })
      } catch (error) {
        fail(res, error, 'Failed to read customer')
      }
    }),

    /** Start hosted KYC, or report the status if the user already onboarded. */
    startOnboarding: withUser(async (_req, res, customerId) => {
      try {
        const existing = await noah.getCustomer(customerId)
        if (existing) {
          res.json({ status: existing })
          return
        }
        const { hostedUrl } = await noah.startOnboarding(
          customerId,
          `${config.appUrl}/?kyc=complete`
        )
        res.json({ status: 'pending', hostedUrl })
      } catch (error) {
        fail(res, error, 'Failed to start onboarding')
      }
    }),

    /** Issue the bank account. `fiatCurrency` picks the rail: USD → ACH, EUR → SEPA. */
    createVirtualAccount: withUser(async (req, res, customerId) => {
      const { walletAddress, fiatCurrency } = req.body as {
        walletAddress?: string
        fiatCurrency?: string
      }
      if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
        res.status(400).json({ error: 'A valid walletAddress is required' })
        return
      }
      const currency = parseCurrency(fiatCurrency)
      if (!currency) {
        res.status(400).json({ error: 'fiatCurrency must be USD or EUR' })
        return
      }

      try {
        if ((await noah.getCustomer(customerId)) !== 'approved') {
          res.status(403).json({ error: 'Identity verification is not approved yet' })
          return
        }
        const account = await noah.createVirtualAccount({
          customerId,
          walletAddress,
          fiatCurrency: currency,
        })
        res.json({ account })
      } catch (error) {
        fail(res, error, 'Failed to issue virtual account')
      }
    }),

    /** Sandbox only — production deposits arrive from a real bank transfer. */
    simulateDeposit: withUser(async (req, res) => {
      if (config.noah.environment !== 'sandbox') {
        res.status(400).json({ error: 'Deposit simulation is sandbox-only' })
        return
      }
      const { paymentMethodId, fiatAmount, fiatCurrency } = req.body as {
        paymentMethodId?: string
        fiatAmount?: string
        fiatCurrency?: string
      }
      const currency = parseCurrency(fiatCurrency)
      if (!paymentMethodId || !fiatAmount || !currency) {
        res
          .status(400)
          .json({ error: 'paymentMethodId, fiatAmount and fiatCurrency (USD|EUR) are required' })
        return
      }

      try {
        await noah.simulateDeposit({ paymentMethodId, fiatAmount, fiatCurrency: currency })
        res.json({ simulated: true })
      } catch (error) {
        fail(res, error, 'Failed to simulate deposit')
      }
    }),

    /**
     * Deposits settle asynchronously, so webhooks are how the app learns money
     * moved: `FiatDeposit` when the transfer lands, `Transaction` when the crypto
     * is sent on-chain, `Customer` when KYC changes.
     */
    webhook: (req: Request, res: Response) => {
      const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body)
      const signature = req.header('Webhook-Signature') ?? ''

      if (!noah.verifyWebhook(rawBody, signature)) {
        console.error('[noah webhook] invalid or missing signature — rejected')
        res.status(401).json({ error: 'Invalid signature' })
        return
      }

      const event = JSON.parse(rawBody) as { EventType?: string; Data?: Record<string, unknown> }
      console.log(`[noah webhook] ${event.EventType}`, event.Data)
      res.json({ received: true })
    },
  }
}
