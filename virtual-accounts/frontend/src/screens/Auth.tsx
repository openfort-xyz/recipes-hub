import { useAuthCallback, useEmailOtpAuth } from '@openfort/react'
import { type FormEvent, useState } from 'react'
import { errorText, fontStack, input, muted, primaryBtn } from '../components/styles'

/** Email OTP sign-in. The Openfort user id becomes the Noah customer id. */
export function Auth() {
  const { isLoading: isCallbackLoading } = useAuthCallback()
  const { requestEmailOtp, signInEmailOtp, isLoading, isRequesting, error, reset } =
    useEmailOtpAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  if (isCallbackLoading) return <p style={muted}>Verifying authentication...</p>

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await requestEmailOtp({ email })
    setOtpSent(true)
  }

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await signInEmailOtp({ email, otp })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ fontFamily: fontStack, fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
          Your own bank account
        </h1>
        <p style={{ ...muted, marginTop: 6 }}>
          Sign in to get a US account number or a European IBAN. Deposits arrive as USDC in your
          wallet.
        </p>
      </div>

      {otpSent ? (
        <form onSubmit={handleVerify} style={formStyle}>
          <p style={muted}>
            We sent a code to <strong style={{ color: 'var(--demo-ink-900)' }}>{email}</strong>
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            required
            style={input}
          />
          {error && <p style={errorText}>{error.message}</p>}
          <button type="submit" disabled={isLoading} style={btn(isLoading)}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => {
              reset()
              setOtp('')
              setOtpSent(false)
            }}
            style={linkBtn}
          >
            Use a different email
          </button>
        </form>
      ) : (
        <form onSubmit={handleRequest} style={formStyle}>
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={input}
          />
          {error && <p style={errorText}>{error.message}</p>}
          <button type="submit" disabled={isRequesting} style={btn(isRequesting)}>
            {isRequesting ? 'Sending...' : 'Continue with email'}
          </button>
        </form>
      )}
    </div>
  )
}

const formStyle = { display: 'flex', flexDirection: 'column' as const, gap: 12 }

const btn = (busy: boolean) => ({ ...primaryBtn, opacity: busy ? 0.6 : 1 })

const linkBtn = {
  background: 'none',
  border: 'none',
  fontSize: '0.85rem',
  color: 'var(--demo-ink-500)',
  cursor: 'pointer',
  fontFamily: fontStack,
}
