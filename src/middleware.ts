import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token && !!token.emailVerified,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*'],
}
