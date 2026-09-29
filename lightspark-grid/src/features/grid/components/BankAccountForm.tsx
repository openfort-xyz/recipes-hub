'use client'

import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SANDBOX_BANK } from '@/features/grid/constants'
import type { UsBankForm } from '@/features/grid/types'

const EMPTY: UsBankForm = {
  fullName: '',
  birthDate: '',
  bankName: '',
  routingNumber: '',
  accountNumber: '',
  bankAccountType: 'CHECKING',
  address: { line1: '', city: '', state: '', postalCode: '', country: 'US' },
}

const FIELDS = [
  ['fullName', 'Account holder name'],
  ['birthDate', 'Date of birth (YYYY-MM-DD)'],
  ['bankName', 'Bank name'],
  ['routingNumber', 'Routing number'],
  ['accountNumber', 'Account number'],
] as const

const ADDRESS_FIELDS = [
  ['line1', 'Street'],
  ['city', 'City'],
  ['state', 'State'],
  ['postalCode', 'ZIP'],
] as const

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Grid pays out over ACH/RTP, so it needs the holder's identity along with the account. */
export function BankAccountForm(props: { prefill: boolean; busy: boolean; onSubmit: (form: UsBankForm) => void }) {
  const [form, setForm] = useState<UsBankForm>(
    props.prefill ? { ...SANDBOX_BANK, address: { ...SANDBOX_BANK.address } } : EMPTY
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    props.onSubmit(form)
  }

  return (
    <form className="grid gap-2" onSubmit={submit}>
      {FIELDS.map(([key, label]) => (
        <input
          key={key}
          className={inputClass}
          placeholder={label}
          required
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ))}
      <div className="grid grid-cols-2 gap-2">
        {ADDRESS_FIELDS.map(([key, label]) => (
          <input
            key={key}
            className={inputClass}
            placeholder={label}
            required
            value={form.address[key]}
            onChange={(e) => setForm({ ...form, address: { ...form.address, [key]: e.target.value } })}
          />
        ))}
      </div>
      {props.prefill && <p className="text-xs text-muted-foreground">Prefilled with Grid sandbox test details.</p>}
      <Button type="submit" disabled={props.busy}>
        {props.busy ? 'Linking…' : 'Link bank account'}
      </Button>
    </form>
  )
}
