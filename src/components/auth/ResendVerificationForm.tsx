'use client'

import * as React from 'react'
import { InputField } from '@/components/ui/InputField'
import { Button } from '@/components/ui/Button'

interface ResendVerificationFormProps {
  initialEmail?: string
}

export function ResendVerificationForm({ initialEmail = '' }: ResendVerificationFormProps) {
  const [email, setEmail] = React.useState(initialEmail)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (!email) {
      setError('Please enter your email address.')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to resend verification. Please try again.')
        return
      }

      setSuccess('A new verification link has been sent to your email address.')
      setEmail('')
    } catch {
      setError('A network error occurred. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleResend} className="space-y-4 mt-6 text-left">
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <svg
            className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg" role="status">
          <svg
            className="w-5 h-5 text-green-600 shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <InputField
        id="resend-email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading}>
        Request New Activation Link
      </Button>
    </form>
  )
}
