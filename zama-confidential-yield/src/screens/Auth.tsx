import { useAuthCallback, useEmailOtpAuth } from '@openfort/react'
import { type FormEvent, useState } from 'react'
import { fontStack, inputStyle, label, primaryBtn } from '../components/styles'

function EmailOtpForm() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const { requestEmailOtp, signInEmailOtp, isLoading, isRequesting, error, reset } =
    useEmailOtpAuth()

  const handleRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await requestEmailOtp({ email })
    setOtpSent(true)
  }

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await signInEmailOtp({ email, otp })
  }

  if (!otpSent) {
    return (
      <form onSubmit={handleRequest} style={formStyle}>
        <div>
          <label htmlFor="email" style={label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        {error && <p style={errStyle}>{error.message}</p>}
        <button
          type="submit"
          disabled={isRequesting}
          style={{ ...primaryBtn, opacity: isRequesting ? 0.6 : 1 }}
        >
          {isRequesting ? 'Sending…' : 'Send verification code'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerify} style={formStyle}>
      <p
        style={{
          margin: 0,
          fontSize: '0.85rem',
          color: 'var(--pd-ink-500)',
          fontFamily: fontStack,
          lineHeight: 1.5,
        }}
      >
        Code sent to <strong style={{ color: 'var(--pd-ink-900)' }}>{email}</strong>
      </p>
      <div>
        <label htmlFor="otp" style={label}>
          Verification code
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          placeholder="6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          style={inputStyle}
        />
      </div>
      {error && <p style={errStyle}>{error.message}</p>}
      <button
        type="submit"
        disabled={isLoading}
        style={{ ...primaryBtn, opacity: isLoading ? 0.6 : 1 }}
      >
        {isLoading ? 'Verifying…' : 'Verify'}
      </button>
      <button
        type="button"
        onClick={() => {
          reset()
          setOtp('')
          setOtpSent(false)
        }}
        style={textBtn}
      >
        Use a different email
      </button>
    </form>
  )
}

export function Auth() {
  const { isLoading } = useAuthCallback()
  if (isLoading) {
    return (
      <div style={{ padding: 24, fontFamily: fontStack, color: 'var(--pd-ink-500)' }}>
        Verifying…
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: fontStack,
            fontWeight: 700,
            fontSize: '1.2rem',
            letterSpacing: '-0.01em',
          }}
        >
          Confidential USDC
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
          Sign in to shield USDC and earn private yield, powered by an Openfort embedded wallet.
        </p>
      </div>
      <EmailOtpForm />
    </div>
  )
}

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  animation: 'pd-rise .5s ease both',
} as const
const errStyle = {
  margin: 0,
  color: '#dc2626',
  fontSize: '0.82rem',
  fontFamily: fontStack,
} as const
const textBtn = {
  background: 'none',
  border: 'none',
  fontSize: '0.82rem',
  color: 'var(--pd-ink-500)',
  cursor: 'pointer',
  fontFamily: fontStack,
} as const
