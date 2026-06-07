import type { ReactNode } from 'react'

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 text-left">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}
