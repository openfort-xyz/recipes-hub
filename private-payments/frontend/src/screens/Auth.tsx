import { useAuthCallback, useEmailOtpAuth } from '@openfort/react'
import { type CSSProperties, type FormEvent, useState } from 'react'
import { fontStack, monoStack, primaryBtn } from '../components/styles'

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid var(--demo-border)',
  borderRadius: 'var(--radius-md)',
  fontFamily: monoStack,
  fontSize: '0.95rem',
  fontWeight: 500,
  background: 'var(--pd-surface)',
  color: 'var(--pd-ink-900)',
  outline: 'none',
  boxSizing: 'border-box',
}

const EmailOtpForm = () => {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const { requestEmailOtp, signInEmailOtp, isLoading, isRequesting, error, reset } =
    useEmailOtpAuth()

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await requestEmailOtp({ email })
    setOtpSent(true)
  }

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await signInEmailOtp({ email, otp })
  }

  if (!otpSent) {
    return (
      <form
        onSubmit={handleRequestOtp}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'pd-rise .5s ease both',
        }}
      >
        <label htmlFor="email" style={labelStyle}>
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={inputStyle}
        />
        {error && <p style={errorStyle}>{error.message}</p>}
        <button
          type="submit"
          disabled={isRequesting}
          style={{ ...primaryBtn, marginTop: 4, opacity: isRequesting ? 0.6 : 1 }}
        >
          {isRequesting ? 'Sending...' : 'Send verification code'}
        </button>
      </form>
    )
  }

  return (
    <form
      onSubmit={handleVerifyOtp}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        animation: 'pd-rise .5s ease both',
      }}
    >
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--pd-ink-500)',
          margin: 0,
          fontFamily: fontStack,
          lineHeight: 1.5,
        }}
      >
        We sent a verification code to{' '}
        <strong style={{ color: 'var(--pd-ink-900)' }}>{email}</strong>
      </p>
      <label htmlFor="otp" style={labelStyle}>
        Verification code
      </label>
      <input
        id="otp"
        type="text"
        inputMode="numeric"
        placeholder="Enter the 6-digit code"
        value={otp}
        onChange={(event) => setOtp(event.target.value)}
        required
        style={inputStyle}
      />
      {error && <p style={errorStyle}>{error.message}</p>}
      <button
        type="submit"
        disabled={isLoading}
        style={{ ...primaryBtn, marginTop: 4, opacity: isLoading ? 0.6 : 1 }}
      >
        {isLoading ? 'Verifying...' : 'Verify'}
      </button>
      <button
        type="button"
        onClick={() => {
          reset()
          setOtp('')
          setOtpSent(false)
        }}
        style={{
          background: 'none',
          border: 'none',
          width: '100%',
          fontSize: '0.85rem',
          color: 'var(--pd-ink-500)',
          cursor: 'pointer',
          fontFamily: fontStack,
          padding: '4px 0',
        }}
      >
        Use a different email
      </button>
    </form>
  )
}

export const Auth = () => {
  const { isLoading } = useAuthCallback()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: fontStack,
          fontSize: '0.9rem',
          color: 'var(--pd-ink-500)',
        }}
      >
        Verifying authentication...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1
          style={{
            textAlign: 'left',
            fontSize: '1.15rem',
            fontWeight: 700,
            margin: 0,
            fontFamily: fontStack,
            color: 'var(--pd-ink-900)',
            letterSpacing: '-0.01em',
          }}
        >
          Accounts Payable
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: '0.85rem',
            color: 'var(--pd-ink-500)',
            fontFamily: fontStack,
            lineHeight: 1.5,
          }}
        >
          Sign in to pay supplier invoices privately on Monad.
        </p>
      </div>
      <EmailOtpForm />
    </div>
  )
}

const labelStyle: CSSProperties = {
  display: 'block',
  textAlign: 'left',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--pd-ink-700)',
  fontFamily: fontStack,
  marginBottom: -8,
}

const errorStyle: CSSProperties = {
  color: '#dc2626',
  fontSize: '0.85rem',
  margin: 0,
  fontFamily: fontStack,
}
