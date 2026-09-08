import type { ReactNode } from 'react'

export function Card({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  children: ReactNode
}) {
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 text-left">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {badge && (
          <span className="text-[10px] uppercase tracking-wide text-neutral-400 border border-neutral-700 rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}
