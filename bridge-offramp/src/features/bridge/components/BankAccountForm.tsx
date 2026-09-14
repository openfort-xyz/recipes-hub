'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { BankForm } from '@/features/bridge/use-cash-out'

interface Props {
  currency: 'usd' | 'eur'
  busy: boolean
  onSubmit: (form: BankForm) => void
}

const field =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * Bridge takes a different account shape per rail: routing + account number for
 * US accounts, IBAN + BIC for European ones. The country codes are ISO 3166-1
 * alpha-3 (USA, NLD), not the two-letter codes most forms use.
 */
export function BankAccountForm({ currency, busy, onSubmit }: Props) {
  const isEur = currency === 'eur'
  const [values, setValues] = useState<Record<string, string>>({
    bankName: '',
    accountOwnerName: '',
    firstName: '',
    lastName: '',
    routingNumber: '',
    accountNumber: '',
    iban: '',
    bic: '',
    ibanCountry: isEur ? 'NLD' : 'USA',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: isEur ? 'NLD' : 'USA',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      currency,
      bankName: values.bankName,
      accountOwnerName: values.accountOwnerName,
      firstName: values.firstName || undefined,
      lastName: values.lastName || undefined,
      ...(isEur
        ? { iban: values.iban, bic: values.bic, ibanCountry: values.ibanCountry }
        : { routingNumber: values.routingNumber, accountNumber: values.accountNumber }),
      address: {
        street_line_1: values.street,
        city: values.city,
        state: values.state || undefined,
        postal_code: values.postalCode,
        country: values.country,
      },
    })
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="Bank name" value={values.bankName} onChange={set('bankName')} required />
        <input
          className={field}
          placeholder="Account holder"
          value={values.accountOwnerName}
          onChange={set('accountOwnerName')}
          required
        />
      </div>

      {isEur ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="First name" value={values.firstName} onChange={set('firstName')} />
            <input className={field} placeholder="Last name" value={values.lastName} onChange={set('lastName')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className={`${field} sm:col-span-2`}
              placeholder="IBAN"
              value={values.iban}
              onChange={set('iban')}
              required
            />
            <input className={field} placeholder="BIC" value={values.bic} onChange={set('bic')} required />
          </div>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={field}
            placeholder="Routing number"
            value={values.routingNumber}
            onChange={set('routingNumber')}
            required
          />
          <input
            className={field}
            placeholder="Account number"
            value={values.accountNumber}
            onChange={set('accountNumber')}
            required
          />
        </div>
      )}

      <input className={field} placeholder="Street" value={values.street} onChange={set('street')} required />
      <div className="grid gap-3 sm:grid-cols-4">
        <input
          className={`${field} sm:col-span-2`}
          placeholder="City"
          value={values.city}
          onChange={set('city')}
          required
        />
        {!isEur && <input className={field} placeholder="State" value={values.state} onChange={set('state')} />}
        <input
          className={field}
          placeholder="Postal code"
          value={values.postalCode}
          onChange={set('postalCode')}
          required
        />
      </div>
      <input
        className={field}
        placeholder="Country (ISO-3, e.g. USA)"
        value={values.country}
        onChange={set('country')}
        required
      />

      <Button type="submit" disabled={busy}>
        {busy ? 'Linking…' : `Link ${currency.toUpperCase()} account`}
      </Button>
    </form>
  )
}
