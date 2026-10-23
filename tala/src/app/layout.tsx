import './globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Footer from '@/components/footer'
import Header from '@/components/header'
import AppProviders from './providers'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

// @openfort/react needs its publishable key at render time, which App Router
// static prerendering does not provide.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Openfort × Tala credit recipe',
  description:
    'Undercollateralized credit for an Openfort embedded wallet: Tala underwrites and books the loan, the wallet receives and repays it in USDC on Base.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-muted`}>
        <AppProviders>
          <Header />
          {children}
          <Footer />
        </AppProviders>
      </body>
    </html>
  )
}
