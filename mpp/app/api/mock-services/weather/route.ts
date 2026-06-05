import { Mppx, tempo } from 'mppx/nextjs'

const mppx = Mppx.create({
  methods: [
    tempo.charge({
      testnet: true,
      currency: (process.env.MPP_CURRENCY ?? '0x20c0000000000000000000000000000000000000') as `0x${string}`,
      recipient: process.env.MPP_RECIPIENT as `0x${string}`,
    }),
  ],
})

export const GET = mppx.charge({ amount: '0.1' })(() =>
  Response.json({
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
      lastUpdated: new Date().toISOString(),
    },
  })
)
