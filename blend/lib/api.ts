import { SdkError } from '@blend-money/node'
import { NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/validate'

/**
 * Run a route handler behind the admin token, turning its result and thrown errors into JSON.
 * Blend `SdkError`s keep their HTTP status and code so the UI can show them.
 */
export async function guarded(request: Request, handler: () => Promise<unknown>) {
  if (!isAuthorized(request.headers.get('authorization'), process.env.TREASURY_ADMIN_TOKEN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await handler()
    if (result instanceof Response) return result
    // bigint-safe: Blend action plans carry bigint values.
    return new NextResponse(
      JSON.stringify(result, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
      {
        headers: { 'content-type': 'application/json' },
      }
    )
  } catch (error) {
    if (error instanceof SdkError) {
      return NextResponse.json({ error: error.getUserMessage(), code: error.code }, { status: error.status || 500 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 500 })
  }
}
