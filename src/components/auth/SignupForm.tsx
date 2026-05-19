'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { InputField } from '@/components/ui/InputField'
import { Button } from '@/components/ui/Button'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'

export function SignupForm() {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  
  // Field-level error messages
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string[]
    email?: string[]
    password?: string[]
  }>({})
  
  // Form-level error or success alerts
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')
    setFieldErrors({})

    // Basic client-side sanity check
    if (!name || !email || !password) {
      setError('Please fill in all required fields.')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details)
        }
        setError(data.error ?? 'Registration failed. Please try again.')
        return
      }

      setSuccess('Account created successfully! Redirecting to login...')
      setName('')
      setEmail('')
      setPassword('')
      
      // Delay to let the user see the success message
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch {
      setError('A network error occurred. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-left" role="alert">
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
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-left" role="status">
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
        id="signup-name"
        label="Full Name"
        type="text"
        placeholder="Enter your name"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name?.[0]}
        disabled={isLoading}
      />

      <InputField
        id="signup-email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email?.[0]}
        disabled={isLoading}
      />

      <div className="space-y-1">
        <InputField
          id="signup-password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password?.[0]}
          disabled={isLoading}
          ariaDescribedBy="signup-password-strength"
        />
        <PasswordStrengthIndicator password={password} id="signup-password-strength" />
      </div>

      <Button type="submit" isLoading={isLoading} className="mt-6">
        Sign Up
      </Button>
    </form>
  )
}
