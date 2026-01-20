import Openfort from '@openfort/openfort-node'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  // Optional: Add your own authentication middleware here
  // For now, we'll allow authenticated Openfort users

  try {
    // Initialize the Openfort client
    const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY as string)

    const session = await openfort.createEncryptionSession(
      process.env.NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY as string,
      process.env.OPENFORT_SHIELD_SECRET_KEY as string,
      process.env.OPENFORT_SHIELD_ENCRYPTION_SHARE as string
    )

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Shield session creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
