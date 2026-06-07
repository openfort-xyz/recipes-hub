import { Mppx, tempo } from 'mppx/nextjs'

// Lazy-init so importing this route never throws at build time. mppx's server
// charge handler requires a secret key (auto-detected from MPP_SECRET_KEY) to
// HMAC-bind payment challenges; that env var is only present at runtime.
function createMppx() {
  return Mppx.create({
    methods: [
      tempo.charge({
        testnet: true,
        currency: (process.env.MPP_CURRENCY ?? '0x20c0000000000000000000000000000000000000') as `0x${string}`,
        recipient: process.env.MPP_RECIPIENT as `0x${string}`,
      }),
    ],
  })
}

let _mppx: ReturnType<typeof createMppx> | null = null

function getMppx() {
  if (!_mppx) _mppx = createMppx()
  return _mppx
}

const weather = {
  success: true,
  service: 'weather',
  data: {
    location: 'San Francisco, CA',
    temperature: 68,
    unit: 'fahrenheit',
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 12,
    windDirection: 'WSW',
    forecast: 'Clear skies expected this evening',
  },
}

export const GET = (request: Request) =>
  getMppx().charge({ amount: '0.1' })(() =>
    Response.json({ ...weather, data: { ...weather.data, lastUpdated: new Date().toISOString() } })
  )(request)
