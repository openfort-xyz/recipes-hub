'use client'

import { PageLayout } from '@/components/ui/page-layout'
import CashOutFlow from '@/features/bridge/components/CashOutFlow'

export default function Main() {
  return (
    <PageLayout maxWidth="xl">
      <CashOutFlow />
    </PageLayout>
  )
}
