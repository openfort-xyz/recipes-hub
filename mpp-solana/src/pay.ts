import { createPayer } from './payment.js'

const resourceUrl = process.env.RESOURCE_URL ?? 'http://localhost:3010/api/protected'

async function main(): Promise<void> {
  const payer = await createPayer()
  console.log(`Requesting ${resourceUrl} as ${payer.address} ...`)
  const result = await payer.pay(resourceUrl)

  console.log('Status:', result.status)
  if (result.signature) {
    console.log('Settlement signature:', result.signature)
  }
  console.log('Body:', result.body)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
