'use client'

import { PageLayout } from '@/components/ui/page-layout'
import FundingFlow from '@/features/grid/components/FundingFlow'

export default function Main() {
  return (
    <PageLayout maxWidth="xl">
      <FundingFlow />
    </PageLayout>
  )
}
