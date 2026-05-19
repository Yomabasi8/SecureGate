import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
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
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Forgot Password</h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter your email address and we will send you a secure link to reset your password.
            </p>
          </div>
          
          <ForgotPasswordForm />
          
          <div className="mt-6 text-center text-sm text-gray-600">
            Remembered your password?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
