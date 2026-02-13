'use client'

import { useAuthCallback, useEmailOtpAuth } from '@openfort/react'
import { useState } from 'react'

const EmailOtpForm = () => {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const { requestEmailOtp, signInEmailOtp, isLoading, isRequesting, error, reset } = useEmailOtpAuth()

  const handleRequestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await requestEmailOtp({ email })
    setOtpSent(true)
  }

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await signInEmailOtp({ email, otp })
  }

  if (!otpSent) {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-4">
        <label className="block text-left text-sm font-medium mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-sm">{error.message}</p>}
        <button type="submit" className="btn mt-2" disabled={isRequesting}>
          {isRequesting ? 'Sending...' : 'Send verification code'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We sent a verification code to <strong className="text-foreground">{email}</strong>
      </p>
      <label className="block text-left text-sm font-medium mb-1" htmlFor="otp">
        Verification code
      </label>
      <input
        id="otp"
        type="text"
        inputMode="numeric"
        placeholder="Enter the 6-digit code"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        required
        autoFocus
      />
      {error && <p className="text-red-500 text-sm">{error.message}</p>}
      <button type="submit" className="btn mt-2" disabled={isLoading}>
        {isLoading ? 'Verifying...' : 'Verify'}
      </button>
      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        onClick={() => {
          reset()
          setOtp('')
          setOtpSent(false)
        }}
      >
        Use a different email
      </button>
    </form>
  )
}

const AuthForm = () => {
  const { isLoading } = useAuthCallback()

  if (isLoading) {
    return <div>Verifying authentication...</div>
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <h1 className="text-left text-2xl font-semibold tracking-tight">Sign in to account</h1>
      </div>
      <EmailOtpForm />
    </div>
  )
}

export const Auth = () => {
  return <AuthForm />
}
