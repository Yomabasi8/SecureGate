import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { resetPasswordSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data

    // 1. Look up the reset token in the database
    const tokenRecord = await db.passwordResetToken.findUnique({
      where: { token },
    })

    if (!tokenRecord || new Date() > tokenRecord.expires) {
      return NextResponse.json(
        { error: 'This link is invalid or has already been used.' },
        { status: 400 }
      )
    }

    // 2. Hash new password with 12 salt rounds (Phase 4 Cryptographic requirement)
    const hashedPassword = await bcrypt.hash(password, 12)

    // 3. Update the user password matching the token context
    await db.user.update({
      where: { email: tokenRecord.email },
      data: { password: hashedPassword },
    })

    // 4. Clean up / delete all reset tokens for this email to prevent subsequent use
    await db.passwordResetToken.deleteMany({
      where: { email: tokenRecord.email },
    })

    return NextResponse.json(
      { success: true, message: 'Password updated successfully.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[RESET_PASSWORD_POST_ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
