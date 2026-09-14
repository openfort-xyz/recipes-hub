'use client'

import { OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { ThemeProvider } from '@/components/theme-provider'
import { wagmiConfig } from '@/features/openfort/config/wagmi-config'
import { OpenfortProviderBoundary } from '@/features/openfort/providers/openfort-provider-boundary'

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <OpenfortWagmiBridge>
            <OpenfortProviderBoundary>{children}</OpenfortProviderBoundary>
          </OpenfortWagmiBridge>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default AppProviders
