import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/email'

const verifyResendSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = verifyResendSchema.safeParse(body)

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

    // Attacker Enumeration Shielding: only generate/send token if user is registered & unverified
    if (user && !user.emailVerified) {
      const verificationToken = await generateVerificationToken(normalizedEmail)
      await sendVerificationEmail(normalizedEmail, verificationToken.token)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'If this email address matches an unverified account, a verification link has been sent.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[VERIFY_RESEND_POST_ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
