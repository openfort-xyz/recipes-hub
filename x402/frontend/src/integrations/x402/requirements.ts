import type { SupportedNetwork } from './networks'
import { USDC_ADDRESSES } from './networks'
import type { PaymentRequirements } from './types'

export function selectPaymentRequirements(
  paymentRequirements: PaymentRequirements[],
  network?: SupportedNetwork | SupportedNetwork[],
  scheme?: 'exact',
): PaymentRequirements {
  const ordered = sortByNetworkPriority(paymentRequirements)
  const matching = filterRequirements(ordered, network, scheme)

  const preferred = preferUsdcRequirement(matching)
  if (preferred) {
    return preferred
  }

  if (matching.length > 0) {
    return matching[0]
  }

  return fallbackRequirement(ordered)
}

export function ensureValidAmount(
  paymentRequirements: PaymentRequirements,
): PaymentRequirements {
  const updated: PaymentRequirements = JSON.parse(
    JSON.stringify(paymentRequirements),
  )

  const overrideAmount = resolveWindowOverride()
  if (overrideAmount) {
    updated.maxAmountRequired = overrideAmount
  }

  updated.maxAmountRequired = sanitizeAmount(updated.maxAmountRequired)

  return updated
}

function sortByNetworkPriority(
  requirements: PaymentRequirements[],
): PaymentRequirements[] {
  return [...requirements].sort((a, b) => {
    if (a.network === 'base' && b.network !== 'base') return -1
    if (a.network !== 'base' && b.network === 'base') return 1
    return 0
  })
}

function filterRequirements(
  requirements: PaymentRequirements[],
  targetNetwork?: SupportedNetwork | SupportedNetwork[],
  scheme?: 'exact',
): PaymentRequirements[] {
  return requirements.filter((requirement) => {
    const matchesScheme = !scheme || requirement.scheme === scheme
    const matchesNetwork = !targetNetwork
      ? true
      : Array.isArray(targetNetwork)
        ? targetNetwork.includes(requirement.network)
        : requirement.network === targetNetwork
    return matchesScheme && matchesNetwork
  })
}

function preferUsdcRequirement(
  requirements: PaymentRequirements[],
): PaymentRequirements | undefined {
  return requirements.find((req) => isUsdcAddress(req.asset))
}

function fallbackRequirement(
  requirements: PaymentRequirements[],
): PaymentRequirements {
  return requirements[0]!
}

function resolveWindowOverride(): string | undefined {
  if (!window.x402?.amount) {
    return undefined
  }
  const amountInBaseUnits = Math.round(window.x402.amount * 1_000_000)
  return amountInBaseUnits.toString()
}

function sanitizeAmount(value: string): string {
  return /^\d+$/.test(value) ? value : '1000000'
}

function isUsdcAddress(address: string): boolean {
  const normalized = address.toLowerCase()
  return Object.values(USDC_ADDRESSES)
    .map((tokenAddress) => tokenAddress.toLowerCase())
    .includes(normalized)
}
