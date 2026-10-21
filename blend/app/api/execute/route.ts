import { NextResponse } from 'next/server'
import { guarded } from '@/lib/api'
import { execute } from '@/lib/blend'

// Execution waits for Blend to settle the session (up to the SDK's 5-minute poll timeout).
export const maxDuration = 300

export function POST(request: Request) {
  return guarded(request, async () => {
    const { intentId } = await request.json().catch(() => ({}))
    if (typeof intentId !== 'string' || !intentId) {
      return NextResponse.json({ error: 'Body must be { intentId: string }' }, { status: 400 })
    }
    return execute(intentId)
  })
}
