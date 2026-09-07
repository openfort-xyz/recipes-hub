import { useUser } from '@openfort/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { type CSSProperties, useState } from 'react'
import { erc20Abi, formatUnits } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import {
  card,
  errorText,
  fontStack,
  input,
  label,
  monoStack,
  muted,
  primaryBtn,
  secondaryBtn,
} from '../components/styles'
import { api, type FiatCurrency, railLabels, type VirtualAccount } from '../lib/api'
import { chain, EXPLORER_URL, IS_SANDBOX, USDC_ADDRESS, USDC_DECIMALS } from '../openfort/wagmi'

const CURRENCIES: FiatCurrency[] = ['USD', 'EUR']

export function Dashboard() {
  const { getAccessToken } = useUser()
  const { address } = useAccount()
  const [currency, setCurrency] = useState<FiatCurrency>('USD')
  // One account per currency — issuing EUR does not replace the USD one.
  const [accounts, setAccounts] = useState<Partial<Record<FiatCurrency, VirtualAccount>>>({})

  const customer = useQuery({
    queryKey: ['banking-customer'],
    queryFn: () => api.getCustomer(getAccessToken),
    // Hosted KYC finishes out of band, so poll while it is in flight.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 5000 : false),
  })

  const onboarding = useMutation({
    mutationFn: () => api.startOnboarding(getAccessToken),
    onSuccess: (result) => {
      if (result.hostedUrl) window.location.assign(result.hostedUrl)
      else customer.refetch()
    },
  })

  const issue = useMutation({
    mutationFn: () => {
      if (!address) throw new Error('No wallet address')
      return api.createVirtualAccount(getAccessToken, {
        walletAddress: address,
        fiatCurrency: currency,
      })
    },
    onSuccess: ({ account }) => setAccounts((prev) => ({ ...prev, [account.currency]: account })),
  })

  const balance = useReadContract({
    abi: erc20Abi,
    address: USDC_ADDRESS,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: chain.id,
    query: { enabled: Boolean(address), refetchInterval: 10_000 },
  })

  const account = accounts[currency]
  const isApproved = customer.data?.status === 'approved'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header>
        <h1 style={{ fontFamily: fontStack, fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
          Virtual bank accounts
        </h1>
        <p style={{ ...muted, marginTop: 6 }}>
          Deposits are converted to USDC and sent to your wallet on {chain.name}.
        </p>
      </header>

      <section style={card}>
        <span style={label}>Wallet balance</span>
        <p
          style={{
            fontFamily: monoStack,
            fontSize: '1.9rem',
            fontWeight: 700,
            margin: '6px 0 2px',
          }}
        >
          {balance.data === undefined
            ? '—'
            : `${Number(formatUnits(balance.data, USDC_DECIMALS)).toFixed(2)} USDC`}
        </p>
        {address && (
          <a
            href={`${EXPLORER_URL}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            style={{ ...muted, fontFamily: monoStack, textDecoration: 'none' }}
          >
            {`${address.slice(0, 6)}...${address.slice(-4)}`} ↗
          </a>
        )}
      </section>

      <section style={card}>
        <span style={label}>Identity</span>
        {customer.isLoading ? (
          <p style={{ ...muted, marginTop: 8 }}>Checking status...</p>
        ) : isApproved ? (
          <p style={{ ...muted, marginTop: 8 }}>
            ✓ Verified with Noah — you can issue bank accounts.
          </p>
        ) : (
          <>
            <p style={{ ...muted, margin: '8px 0 12px' }}>
              {customer.data?.status === 'pending'
                ? 'Verification in progress. This page updates when Noah approves it.'
                : 'Noah verifies your identity before issuing an account. This opens their hosted flow.'}
            </p>
            <button
              type="button"
              onClick={() => onboarding.mutate()}
              disabled={onboarding.isPending}
              style={{ ...primaryBtn, opacity: onboarding.isPending ? 0.6 : 1 }}
            >
              {onboarding.isPending ? 'Starting...' : 'Verify identity'}
            </button>
            {onboarding.error && <p style={errorText}>{onboarding.error.message}</p>}
          </>
        )}
      </section>

      <section style={card}>
        <span style={label}>Currency</span>
        <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
          {CURRENCIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCurrency(option)}
              style={toggleBtn(option === currency)}
            >
              {option === 'USD' ? 'USD · ACH' : 'EUR · SEPA'}
            </button>
          ))}
        </div>

        {account ? (
          <AccountDetails account={account} />
        ) : (
          <>
            <p style={{ ...muted, marginBottom: 12 }}>
              {currency === 'USD'
                ? 'A US account number and routing number in your name.'
                : 'A European IBAN and BIC in your name.'}
            </p>
            <button
              type="button"
              onClick={() => issue.mutate()}
              disabled={!isApproved || issue.isPending}
              style={{ ...primaryBtn, opacity: !isApproved || issue.isPending ? 0.5 : 1 }}
            >
              {issue.isPending ? 'Issuing...' : `Get ${currency} bank details`}
            </button>
          </>
        )}
        {issue.error && <p style={{ ...errorText, marginTop: 10 }}>{issue.error.message}</p>}
      </section>

      {IS_SANDBOX && account && (
        <SimulateDeposit account={account} onSimulated={() => balance.refetch()} />
      )}
    </div>
  )
}

function AccountDetails({ account }: { account: VirtualAccount }) {
  const labels = railLabels(account)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <CopyField label={labels.code} value={account.bankCode} />
      <CopyField label={labels.number} value={account.accountNumber} />
      <dl style={{ margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Detail label="Account holder" value={account.accountHolderName} />
        <Detail label="Bank" value={account.bankName} />
        <Detail label="Transfer type" value={`${labels.rail} · ${account.currency}`} />
      </dl>
    </div>
  )
}

function CopyField({ label: fieldLabel, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--demo-border)',
        background: 'var(--demo-surface-soft)',
        cursor: 'pointer',
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ ...label, display: 'block' }}>{fieldLabel}</span>
        <span
          style={{
            display: 'block',
            fontFamily: monoStack,
            fontSize: '0.95rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </span>
      </span>
      <span style={{ ...muted, fontSize: '0.75rem' }}>{copied ? '✓' : 'Copy'}</span>
    </button>
  )
}

function Detail({ label: name, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, ...muted }}>
      <dt>{name}</dt>
      <dd style={{ margin: 0, color: 'var(--demo-ink-900)' }}>{value}</dd>
    </div>
  )
}

/** Sandbox-only shortcut: Noah pretends a bank transfer landed and runs the real
 * conversion path, so the wallet balance moves without a real transfer. */
function SimulateDeposit({
  account,
  onSimulated,
}: {
  account: VirtualAccount
  onSimulated: () => void
}) {
  const { getAccessToken } = useUser()
  const [amount, setAmount] = useState('100')

  const simulate = useMutation({
    mutationFn: () =>
      api.simulateDeposit(getAccessToken, {
        paymentMethodId: account.paymentMethodId,
        fiatAmount: amount,
        fiatCurrency: account.currency,
      }),
    onSuccess: onSimulated,
  })

  return (
    <section style={{ ...card, borderStyle: 'dashed' }}>
      <span style={label}>Sandbox · simulate a deposit</span>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 0' }}>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          style={{ ...input, flex: 1 }}
        />
        <button
          type="button"
          onClick={() => simulate.mutate()}
          disabled={simulate.isPending}
          style={{ ...secondaryBtn, width: 'auto', opacity: simulate.isPending ? 0.6 : 1 }}
        >
          {simulate.isPending ? 'Sending...' : `Deposit ${account.currency}`}
        </button>
      </div>
      {simulate.isSuccess && (
        <p style={{ ...muted, marginTop: 10 }}>
          Deposit accepted. Noah converts it and sends USDC — the balance updates shortly.
        </p>
      )}
      {simulate.error && <p style={{ ...errorText, marginTop: 10 }}>{simulate.error.message}</p>}
    </section>
  )
}

const toggleBtn = (active: boolean): CSSProperties => ({
  flex: 1,
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: `1px solid ${active ? '#FC3927' : 'var(--demo-border)'}`,
  background: active ? 'rgba(252,57,39,0.08)' : 'var(--demo-surface)',
  color: active ? '#FC3927' : 'var(--demo-ink-700)',
  fontFamily: fontStack,
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
})
