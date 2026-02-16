import Openfort from '@openfort/openfort-node'

function getOpenfort() {
  const key = process.env.OPENFORT_SECRET_KEY
  if (!key) throw new Error('OPENFORT_SECRET_KEY is not configured')
  return new Openfort(key, {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY,
  })
}

/**
 * Validate the access token from the Authorization header using Openfort IAM.
 * Returns the authenticated session and user, or throws an error.
 */
export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    throw new AuthError('Missing authorization token', 401)
  }

  try {
    const openfort = getOpenfort()
    const { session, user } = await openfort.iam.getSession({ accessToken: token })
    return { session, user }
  } catch (err) {
    console.error('[auth] iam.getSession failed:', err)
    throw new AuthError('Invalid or expired session', 401)
  }
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}
