import type { PaymentRequirements } from '../../../integrations/x402'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function getRequiredAmount(
  paymentRequirements: PaymentRequirements,
): bigint {
  return BigInt(paymentRequirements.maxAmountRequired)
}

export function hasSufficientBalance(
  balance: bigint,
  requiredAmount: bigint,
): boolean {
  return balance >= requiredAmount
}

export function isDestinationConfigured(payTo?: string | null): boolean {
  return Boolean(payTo && payTo.toLowerCase() !== ZERO_ADDRESS)
}
