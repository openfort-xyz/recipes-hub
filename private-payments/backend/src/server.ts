import { config as loadEnv } from 'dotenv'
import express, { type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { loadConfig } from './config.js'
import { createOpenfortClient } from './openfort.js'
import { toExpress } from './routes.js'
import { createUnlinkRoutes } from './unlink.js'

loadEnv({ path: '.env.local' })

const config = loadConfig()
const openfort = createOpenfortClient(config)
const unlinkRoutes = createUnlinkRoutes(config, openfort)

const app = express()
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

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  message: { error: 'Too many requests, try again later.' },
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// Unlink partner integration (non-custodial). The browser client posts here with
// the Openfort bearer token; we authenticate the session, then register the user
// or mint a short-lived authorization token via the admin API key. We never sign.
app.post('/api/unlink/register', writeLimiter, toExpress(unlinkRoutes.register))
app.post(
  '/api/unlink/authorization-token',
  writeLimiter,
  toExpress(unlinkRoutes.authorizationToken)
)

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' })
})

app.listen(config.port, () => {
  console.log(`Private payments backend listening on http://localhost:${config.port}`)
})
