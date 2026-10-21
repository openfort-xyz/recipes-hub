// Enrol the signed-in user with Tala. The Openfort user id is the
// partnerUserId, so Tala holds the mapping and this app needs no database.

import { optIn, TalaError } from '@/features/tala/client'
import { PHONE_REGEX } from '@/features/tala/constants'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const { phoneNumber } = (await req.json()) as { phoneNumber?: string }
    if (!PHONE_REGEX.test(phoneNumber ?? ''))
      throw new TalaError('Enter the phone number as +<country code><number>', 400)
    return Response.json(await optIn(user.id, phoneNumber as string))
  } catch (err) {
    return errorResponse(err)
  }
}
