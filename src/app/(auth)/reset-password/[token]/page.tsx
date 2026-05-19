import Link from 'next/link'
import { db } from '@/lib/db'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

interface ResetPasswordPageProps {
  params: {
    token: string
  }
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { token } = params

  let isValid = false

  try {
    const tokenRecord = await db.passwordResetToken.findUnique({
      where: { token },
    })

    if (tokenRecord && new Date() < tokenRecord.expires) {
      isValid = true
    }
  } catch (error) {
    console.error('[RESET_PASSWORD_PAGE_VERIFY_ERROR]', error)
    isValid = false
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SecureGate</h1>
          <p className="text-sm text-gray-600 mt-1">Secure identity & access management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {isValid ? (
            <div>
              <div className="mb-6 text-left">
                <h2 className="text-xl font-semibold text-gray-900 font-display">Configure New Password</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configure a secure password containing at least 8 characters.
                </p>
              </div>
              <ResetPasswordForm token={token} />
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center border border-red-200">
                <svg className="w-6 h-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900 font-display">Invalid or Expired Link</h2>
                <p className="text-sm text-gray-600">
                  This password reset link is invalid, has already been used, or has expired (1-hour safety limit).
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                <Link
                  href="/forgot-password"
                  className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Request New Password Link
                </Link>
                <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors mt-2 block">
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
