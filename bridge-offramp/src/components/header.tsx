'use client'

import { OpenfortButton } from '@openfort/react'
import Link from 'next/link'
import OpenfortLogo from '@/features/openfort/components/logo'

export default function Header() {
  return (
    <div className="absolute top-0 flex w-full items-center justify-between py-2">
      <Link href="/" className="flex h-[40px] items-center pl-4">
        <OpenfortLogo />
      </Link>
      <div className="pr-4">
        <OpenfortButton />
      </div>
    </div>
  )
}
