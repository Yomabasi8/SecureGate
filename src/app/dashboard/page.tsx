import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

export default async function DashboardPage() {
  // Airtight server-side session lookup fallback
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    redirect('/login')
  }

  const { name, email, emailVerified, isPremium } = session.user

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader name={name || email || 'User'} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl text-left">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Welcome back, {name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-2">
            This dashboard is completely protected. Only authenticated sessions can access this space.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Account Status Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-left">
              <h3 className="text-lg font-semibold text-gray-900">Security & Account</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Email Address</span>
                  <span className="text-sm font-medium text-gray-900">{email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Verification Status</span>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                      Unverified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Premium Unlock Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-left flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Premium Gate</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Unlock advanced developer playbooks and identity tooling via Flutterwave.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-gray-500">Tier Status</span>
                {isPremium ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    Premium Active
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">
                    Upgrade Now →
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
