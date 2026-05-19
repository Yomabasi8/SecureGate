export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { forgotPasswordSchema } from '@/lib/validations'
import { generatePasswordResetToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce IP-based rate limiting for password recovery requests (3 requests/hour)
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await checkRateLimit(ip, 'forgot-password')
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase()

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Attacker Enumeration Shielding: Always return success, regardless of email existence
    if (user) {
      const resetToken = await generatePasswordResetToken(normalizedEmail)
      await sendPasswordResetEmail(normalizedEmail, resetToken.token)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'If this email address is registered, you will receive a password reset link shortly.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[FORGOT_PASSWORD_POST_ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
