import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Enforce IP-based sign in rate limiter (Phase 5 requirement)
        const ip = headers().get('x-forwarded-for') ?? '127.0.0.1'
        const { success } = await checkRateLimit(ip, 'signin')
        if (!success) {
          throw new Error('Too many attempts. Please try again in 10 minutes.')
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid email or password.')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('Invalid email or password.')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error('Invalid email or password.')
        }

        if (!user.emailVerified) {
          throw new Error('Please verify your email before signing in.')
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          isPremium: user.isPremium,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.emailVerified = user.emailVerified
        token.isPremium = user.isPremium
      } else if (token.email) {
        // Sync with the database to automatically catch email verification or premium upgrade events
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: { emailVerified: true, isPremium: true },
        })
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified
          token.isPremium = dbUser.isPremium
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.emailVerified = token.emailVerified
        session.user.isPremium = token.isPremium
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
