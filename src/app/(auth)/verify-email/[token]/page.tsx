import Link from 'next/link'
import { db } from '@/lib/db'
import { ResendVerificationForm } from '@/components/auth/ResendVerificationForm'

interface VerifyEmailPageProps {
  params: {
    token: string
  }
}

export default async function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const { token } = params

  let status: 'success' | 'expired' | 'invalid' = 'invalid'
  let emailAddress = ''

  try {
    // 1. Query the token record in DB
    const tokenRecord = await db.verificationToken.findUnique({
      where: { token },
    })

    if (tokenRecord) {
      emailAddress = tokenRecord.identifier
      
      // 2. Check for token expiration (15-minute window)
      if (new Date() > tokenRecord.expires) {
        status = 'expired'
      } else {
        // 3. Verify user matches token identifier
        const user = await db.user.findUnique({
          where: { email: tokenRecord.identifier },
        })

        if (user) {
          // 4. Mark account verified
          await db.user.update({
            where: { email: tokenRecord.identifier },
            data: { emailVerified: new Date() },
          })

          // 5. Instantly invalidate / delete used token to prevent re-use
          await db.verificationToken.delete({
            where: { token },
          })

          status = 'success'
        }
      }
    }
  } catch (error) {
    console.error('[VERIFY_EMAIL_PAGE_ERROR]', error)
    status = 'invalid'
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
          {status === 'success' && (
            <div className="space-y-6">
              <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
                <svg className="w-6 h-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900 font-display">Account Verified</h2>
                <p className="text-sm text-gray-600">
                  Your email address has been successfully verified! You can now log into your dashboard.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign In to Dashboard
              </Link>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center border border-yellow-200">
                <svg className="w-6 h-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900 font-display">Activation Link Expired</h2>
                <p className="text-sm text-gray-600">
                  This verification link has expired (15-minute security limit). Request a new verification link below.
                </p>
              </div>
              <ResendVerificationForm initialEmail={emailAddress} />
              <div className="mt-6 text-sm text-gray-600 pt-4 border-t border-gray-100">
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center border border-red-200">
                <svg className="w-6 h-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900 font-display">Invalid Activation Link</h2>
                <p className="text-sm text-gray-600">
                  This activation link is invalid, has already been used, or does not exist. You can request a new verification email below.
                </p>
              </div>
              <ResendVerificationForm />
              <div className="mt-6 text-sm text-gray-600 pt-4 border-t border-gray-100">
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
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
