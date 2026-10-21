// Shapes of the Tala CaaS API (docs.tala.co → API Reference), trimmed to the
// fields this recipe reads. Every response is wrapped in { data, metadata }.

export interface Money {
  amount: number
  isoCode: string
}

export interface Envelope<T> {
  data: T | null
  metadata: { statusCode: number; requestId?: string; errors: string[] | null; errorCode: number | null }
}

/** `GET /api/v1/users/{id}/loan/offer`. Interim states carry only `status` + `message`. */
export interface LoanOffer {
  status:
    | 'offer_available'
    | 'rejected'
    | 'offer_processing'
    | 'disbursement'
    | 'drawn'
    | 'delinquent'
    | 'additional_data_required'
  message?: string
  dailyInterestRate?: number
  creditLimit?: { minimum: Money; maximum: Money; incrementAmount: Money }
  durationDays?: { minimum: number; maximum: number }
}

export interface LoanTerms {
  loanAmount: Money
  dueDate: string
  terms: {
    totalInterest: Money
    totalProcessingFee: Money
    totalPrincipal: Money
    totalBalance: Money
  }
}

/** `GET /api/v1/users/{id}/loan`. */
export interface Loan {
  loanId: string
  status: string
  dueDate?: string
  disbursementDate?: string
  outstandingBalances?: { principalBalance: Money; interestBalance: Money; totalBalance: Money }
}
