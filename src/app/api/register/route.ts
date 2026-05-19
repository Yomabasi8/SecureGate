import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { registerSchema } from '@/lib/validations'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // Defensive check: check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      )
    }

    // Hash password with exactly 12 salt rounds (production-grade bcrypt speed/strength trade-off)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create the user record in database
    const user = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: null, // Starts unverified; will be activated via verification token flow
      },
    })

    // Generate secure 256-bit random activation token (Phase 3 Requirement)
    const verificationToken = await generateVerificationToken(user.email)

    // Dispatch verification link via Resend
    await sendVerificationEmail(user.email, verificationToken.token)

    return NextResponse.json(
      { success: true, message: 'User registered successfully. Please check your email to verify your account.' },
      { status: 201 }
    )
  } catch (error) {
    // Mask internal error logs and keep production responses completely clean
    console.error('[REGISTER_POST_ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
