// In-memory stand-in for the Tala CaaS API, used when TALA_BASE_URL is unset.
//
// It answers the same paths with the same `data` shapes as the real API, so
// `client.ts` has one code path. Every user is approved for 5–100 at 0.1% a
// day. No money moves: the "disbursement" only updates the record, while the
// repayment is a real USDC transfer the route verifies on-chain.
// shortcut: state lives in process memory and resets on restart; real Tala keeps it.

import type { Loan, LoanOffer, LoanTerms } from '@/features/tala/types'

interface MockUser {
  loan: (Loan & { principal: number; balance: number }) | null
  repayments: Set<string>
}

interface MockBody {
  customerId?: string
  amount?: { amount: number }
  duration?: number
  dueDate?: string
  partnerLoanId?: string
  loanId?: string
  externalTransactionId?: string
  transactionAmount?: { amount: number }
}

const DAILY_RATE = 0.1 // percent
const store = globalThis as typeof globalThis & { __talaMock?: Map<string, MockUser> }
store.__talaMock ??= new Map<string, MockUser>()
const users = store.__talaMock

class MockError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const isoCode = () => process.env.TALA_CURRENCY ?? 'USD'
const money = (amount: number) => ({ amount: Math.round(amount * 100) / 100, isoCode: isoCode() })
const addDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

export function quoteTerms(amount: number, duration: number): LoanTerms {
  if (!(amount >= 5 && amount <= 100)) throw new MockError('Amount is outside the approved offer range', 400)
  if (!(Number.isInteger(duration) && duration >= 7 && duration <= 30))
    throw new MockError('Selected duration is not available', 400)
  const interest = (amount * DAILY_RATE * duration) / 100
  return {
    loanAmount: money(amount),
    dueDate: addDays(duration),
    terms: {
      totalInterest: money(interest),
      totalProcessingFee: money(0),
      totalPrincipal: money(amount),
      totalBalance: money(amount + interest),
    },
  }
}

export function mockTala(method: string, path: string, body: unknown): unknown {
  const b = (body ?? {}) as MockBody
  if (method === 'POST' && path === '/api/v1/users/opt-in') {
    const id = String(b.customerId)
    users.set(id, users.get(id) ?? { loan: null, repayments: new Set() })
    return { status: 'success', message: 'Opt-in request received and processing' }
  }

  const match = path.match(/^\/api\/v[12]\/users\/([^/]+)\/(.+)$/)
  const u = match && users.get(decodeURIComponent(match[1]))
  if (!match || !u) throw new MockError('The requested resource was not found', 404)
  const route = `${method} ${match[2]}`

  switch (route) {
    case 'GET loan/offer': {
      if (u.loan) return { status: u.loan.status as LoanOffer['status'], message: 'User has an active loan' }
      return {
        status: 'offer_available',
        dailyInterestRate: DAILY_RATE,
        creditLimit: { minimum: money(5), maximum: money(100), incrementAmount: money(5) },
        durationDays: { minimum: 7, maximum: 30 },
      } satisfies LoanOffer
    }
    case 'POST loan/terms':
      return { loanTerms: quoteTerms(Number(b.amount?.amount), Number(b.duration)) }
    case 'PUT loan/offer': {
      if (u.loan) throw new MockError('User already has an active loan', 409)
      const amount = Number(b.amount?.amount)
      const days = Math.round((Date.parse(String(b.dueDate)) - Date.now()) / 86_400_000)
      const terms = quoteTerms(amount, days)
      const loanId = `LN-${Date.now()}`
      u.loan = {
        loanId,
        status: 'disbursement',
        dueDate: terms.dueDate,
        principal: amount,
        balance: terms.terms.totalBalance.amount,
      }
      return { loanId, status: 'ACCEPTED', partnerLoanId: b.partnerLoanId }
    }
    case 'POST disbursement/request': {
      if (u.loan?.status !== 'disbursement') throw new MockError('No loan awaiting disbursement', 400)
      u.loan.status = 'drawn'
      u.loan.disbursementDate = new Date().toISOString().slice(0, 10)
      return { disbursementId: Date.now(), status: 'PENDING', message: 'Accepted pending Disbursement' }
    }
    case 'GET loan': {
      if (!u.loan) throw new MockError('The requested resource was not found', 404)
      const { principal, balance, ...loan } = u.loan
      return {
        ...loan,
        outstandingBalances: {
          principalBalance: money(Math.min(principal, balance)),
          interestBalance: money(Math.max(0, balance - principal)),
          totalBalance: money(balance),
        },
      } satisfies Loan
    }
    case 'POST repayment/notification': {
      if (!u.loan || u.loan.loanId !== b.loanId) throw new MockError('The provided loan ID is invalid', 400)
      const ref = String(b.externalTransactionId)
      if (u.repayments.has(ref)) throw new MockError('Duplicate externalTransactionId', 409)
      u.repayments.add(ref)
      u.loan.balance = Math.max(0, u.loan.balance - Number(b.transactionAmount?.amount))
      // A fully repaid loan closes and moves to history; the user can borrow again.
      if (u.loan.balance < 0.01) u.loan = null
      return { status: 'success' }
    }
    default:
      throw new MockError(`Mock Tala does not implement ${route}`, 501)
  }
}
