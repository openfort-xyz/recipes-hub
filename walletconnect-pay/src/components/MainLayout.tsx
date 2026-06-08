import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-black/95 flex items-center justify-center p-4 font-figtree">
      <div className="w-full max-w-md mx-auto text-center flex flex-col items-center justify-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          Openfort <br /> + WalletConnect Pay
        </h1>
        <p className="text-neutral-400 mb-10">Pay a merchant link with your embedded wallet.</p>
        {children}
      </div>
    </div>
  )
}
