'use client'

import { PageLayout } from '@/components/ui/page-layout'
import CreditFlow from '@/features/tala/components/CreditFlow'

export default function Main() {
  return (
    <PageLayout maxWidth="xl">
      <CreditFlow />
    </PageLayout>
  )
}
