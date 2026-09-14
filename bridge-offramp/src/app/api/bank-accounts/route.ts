// Where the money lands. One external account per rail.

import { createExternalAccount } from '@/features/bridge/client'
import type { PostalAddress } from '@/features/bridge/types'
import { authenticateRequest, errorResponse } from '@/lib/auth'
import { getRecord, updateRecord } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  currency: 'usd' | 'eur'
  bankName: string
  accountOwnerName: string
  address: PostalAddress
  routingNumber?: string
  accountNumber?: string
  iban?: string
  bic?: string
  ibanCountry?: string
  firstName?: string
  lastName?: string
}

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const record = await getRecord(user.id)
    if (!record.bridgeCustomerId) {
      return Response.json({ error: 'Verify your identity before linking a bank account' }, { status: 409 })
    }

    const body = (await req.json()) as Body
    const isEur = body.currency === 'eur'

    if (isEur ? !(body.iban && body.bic && body.ibanCountry) : !(body.routingNumber && body.accountNumber)) {
      return Response.json(
        { error: isEur ? 'IBAN, BIC and country are required' : 'Routing and account number are required' },
        { status: 400 }
      )
    }

    const account = await createExternalAccount({
      customerId: record.bridgeCustomerId,
      userId: user.id,
      bankName: body.bankName,
      accountOwnerName: body.accountOwnerName,
      address: body.address,
      firstName: body.firstName,
      lastName: body.lastName,
      ...(isEur
        ? { iban: { account_number: body.iban!, bic: body.bic!, country: body.ibanCountry! } }
        : {
            us: {
              account_number: body.accountNumber!,
              routing_number: body.routingNumber!,
              checking_or_savings: 'checking',
            },
          }),
    })

    const stored = {
      id: account.id,
      currency: body.currency,
      bankName: account.bank_name,
      last4: account.account?.last_4 ?? account.iban?.last_4 ?? '****',
    }

    await updateRecord(user.id, (r) => ({
      ...r,
      // Re-linking the same rail replaces it rather than stacking duplicates.
      bankAccounts: [...r.bankAccounts.filter((b) => b.currency !== stored.currency), stored],
    }))

    return Response.json({ bankAccount: stored })
  } catch (err) {
    return errorResponse(err)
  }
}
