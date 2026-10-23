import { guarded } from '@/lib/api'
import { getTreasuryStatus } from '@/lib/blend'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  return guarded(request, getTreasuryStatus)
}
