import { config as loadEnv } from 'dotenv'
import express, { type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { loadConfig } from './config.js'
import { createNoahClient } from './noah.js'
import { createOpenfortClient } from './openfort.js'
import { createRoutes } from './routes.js'

loadEnv({ path: '.env.local' })

const config = loadConfig()
const openfort = createOpenfortClient(config)
const noah = createNoahClient(config)
const routes = createRoutes(config, openfort, noah)

const app = express()

// Every /api/banking route either authenticates a session or verifies a
// signature, so all of them are rate-limited.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  message: { error: 'Too many requests, try again later.' },
})

// The webhook signature covers the RAW body, so it must not be parsed first.
app.post('/api/banking/webhooks', limiter, express.raw({ type: '*/*' }), routes.webhook)
app.use(express.json())

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (config.allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', environment: config.noah.environment })
})

app.get('/api/banking/customer', limiter, routes.getCustomer)
app.post('/api/banking/customer', limiter, routes.startOnboarding)
app.post('/api/banking/virtual-account', limiter, routes.createVirtualAccount)
app.post('/api/banking/simulate-deposit', limiter, routes.simulateDeposit)

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' })
})

app.listen(config.port, () => {
  console.log(
    `Virtual accounts backend listening on http://localhost:${config.port} (${config.noah.environment})`
  )
})
