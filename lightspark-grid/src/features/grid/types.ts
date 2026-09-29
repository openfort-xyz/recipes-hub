// The slice of Grid's API shapes this recipe reads. Full spec:
// https://github.com/lightsparkdev/grid-api (openapi.yaml).

export interface Customer {
  id: string
  platformCustomerId: string
  kycStatus: string
  fullName?: string
  email?: string
}

export interface ExternalAccount {
  id: string
  customerId: string
  currency: string
  status: string
  accountInfo: {
    accountType: string
    address?: string
    accountNumber?: string
    bankName?: string
  }
}

export interface Currency {
  code: string
  decimals: number
}

/** One way to fund a quote: a bank account for fiat, a deposit address for crypto. */
export interface PaymentInstruction {
  instructionsNotes?: string
  accountOrWalletInfo: {
    accountType: string
    address?: string
    assetType?: string
    accountNumber?: string
    routingNumber?: string
    reference?: string
    bankName?: string
    paymentRails?: string[]
  }
}

export interface Quote {
  id: string
  status: string
  expiresAt: string
  source: { customerId?: string }
  sendingCurrency: Currency
  receivingCurrency: Currency
  totalSendingAmount: number
  totalReceivingAmount: number
  feesIncluded: number
  paymentInstructions: PaymentInstruction[]
  transactionId: string
}

export interface Transaction {
  id: string
  customerId?: string
  status: string
  paymentRail?: string | null
  settledAt?: string | null
  failureReason?: string | null
}

export interface UsBankForm {
  fullName: string
  birthDate: string
  bankName: string
  routingNumber: string
  accountNumber: string
  bankAccountType: 'CHECKING' | 'SAVINGS'
  address: {
    line1: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}
