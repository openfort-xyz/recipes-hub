import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-black/95 flex items-center justify-center p-4 font-figtree">
      <div className="w-full max-w-md mx-auto text-center flex flex-col items-center justify-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight text-balance">
          Openfort <span className="text-neutral-500">×</span> WalletConnect Pay
        </h1>
        <p className="text-neutral-400 mb-8 text-sm">Pay a merchant link with your embedded wallet.</p>
        {children}
      </div>
    </div>
  )
}
