import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Openfort + 7702',
  description: 'A demo of Openfort embedded wallets with EIP-7702 authorization and gasless transactions',
}

// The Openfort provider needs a publishable key at render time, so pages are
// rendered on demand rather than statically prerendered at build.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
