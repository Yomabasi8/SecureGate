'use client'

import * as React from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { InputField } from '@/components/ui/InputField'
import { Button } from '@/components/ui/Button'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  // Auto-detect errors sent in NextAuth URL query parameters
  React.useEffect(() => {
    const authError = searchParams.get('error')
    if (authError === 'CredentialsSignin') {
      setError('Invalid email or password.')
    } else if (authError) {
      if (authError.includes('verify your email')) {
        setError('Please verify your email before signing in.')
      } else if (authError.includes('Too many attempts')) {
        setError('Too many attempts. Please try again in 10 minutes.')
      } else {
        setError(authError)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password.')
      setIsLoading(false)
      return
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (!res) {
        setError('Something went wrong. Please try again.')
        return
      }

      if (res.error) {
        // Enforce design-system messages for specific security errors
        if (res.error.includes('verify your email')) {
          setError('Please verify your email before signing in.')
        } else if (res.error.includes('Too many attempts')) {
          setError('Too many attempts. Please try again in 10 minutes.')
        } else {
          setError('Invalid email or password.')
        }
        return
      }

      // Successful login - route to dashboard
      router.push('/dashboard')
      router.refresh()
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

      <InputField
        id="login-email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />

      <InputField
        id="login-password"
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading} className="mt-6">
        Sign In
      </Button>
    </form>
  )
}
