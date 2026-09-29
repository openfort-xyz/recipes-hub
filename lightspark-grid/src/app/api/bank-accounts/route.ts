// Link the US bank account that cash-outs are paid to.

import { createBankAccount } from '@/features/grid/client'
import { customerFor } from '@/features/grid/customer'
import type { UsBankForm } from '@/features/grid/types'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const form = (await req.json()) as UsBankForm
    const customer = await customerFor(user)
    const bank = await createBankAccount(customer.id, form)
    return Response.json({ id: bank.id })
  } catch (err) {
    return errorResponse(err)
  }
}
