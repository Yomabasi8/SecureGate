import crypto from 'crypto'
import { db } from '@/lib/db'

/**
 * Generate a cryptographically secure hex token of 256 bits of entropy
 */
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Check if a given date has passed the current time
 */
export function isTokenExpired(expires: Date): boolean {
  return new Date() > expires
}

/**
 * Generate and save an email verification token for the specified user
 * Expiry: 15 minutes
 */
export async function generateVerificationToken(email: string) {
  const token = generateRandomToken()
  const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  // Clean up any existing verification tokens for this user email
  await db.verificationToken.deleteMany({
    where: { identifier: email.toLowerCase() },
  })

  // Create the new verification token
  const verificationToken = await db.verificationToken.create({
    data: {
      identifier: email.toLowerCase(),
      token,
      expires,
    },
  })

  return verificationToken
}

/**
 * Generate and save a password reset token for the specified email
 * Expiry: 1 hour
 */
export async function generatePasswordResetToken(email: string) {
  const token = generateRandomToken()
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  // Clean up any existing password reset tokens for this email
  await db.passwordResetToken.deleteMany({
    where: { email: email.toLowerCase() },
  })

  // Create the new password reset token
  const passwordResetToken = await db.passwordResetToken.create({
    data: {
      email: email.toLowerCase(),
      token,
      expires,
    },
  })

  return passwordResetToken
}
