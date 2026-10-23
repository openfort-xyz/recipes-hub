import type { ReactNode } from 'react'

/** A phone-sized device frame, so the recipe reads like the mobile app it would ship in. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-[780px] max-h-[calc(100svh-7rem)] w-[390px] max-w-full rounded-[3rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl dark:border-neutral-700">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[2.4rem] bg-background">
        <div className="flex h-11 shrink-0 items-center justify-between px-7 pt-1 text-xs font-semibold">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-neutral-900" />
          <span className="tracking-widest">•••</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
