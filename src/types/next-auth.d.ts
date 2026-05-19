import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      emailVerified?: Date | null
      isPremium?: boolean
    }
  }

  interface User {
    id: string
    emailVerified?: Date | null
    isPremium?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    emailVerified?: Date | null
    isPremium?: boolean
  }
}
