"use client";

import { PageLayout } from "@/components/ui/page-layout";
import SwapFlow from "@/features/near-intents/components/SwapFlow";

export default function Main() {
  return (
    <PageLayout maxWidth="5xl">
      <SwapFlow />
    </PageLayout>
  );
}
