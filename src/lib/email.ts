import { Resend } from 'resend'

// Defensive instantiation of Resend client
const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

// Application URL configuration
const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
const emailFrom = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'

/**
 * Dispatches a verification link to activate a newly registered profile.
 * Falls back to printing URLs to terminal stdout to bypass mail servers in development.
 */
export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${appUrl}/verify-email/${token}`

  // 1. Attempt to send via Resend
  if (resend) {
    try {
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: 'Verify your SecureGate account',
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #111827;">
            <h2 style="font-size: 20px; font-weight: bold;">Verify your SecureGate email</h2>
            <p style="margin-top: 16px; font-size: 14px; color: #4b5563;">
              Thank you for registering. Please click the button below to verify your email address and activate your account.
            </p>
            <div style="margin-top: 24px;">
              <a href="${verifyLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-block;">
                Verify Email
              </a>
            </div>
            <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
              If the button doesn't work, copy and paste this URL into your browser: <br />
              <a href="${verifyLink}" style="color: #2563eb;">${verifyLink}</a>
            </p>
            <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
              This verification link expires in 15 minutes.
            </p>
          </div>
        `,
      })
    } catch (error) {
      console.error('[EMAIL_VERIFICATION_RESEND_ERROR] Resend sending failed:', error)
    }
  }

  // 2. Always fallback/log to stdout to facilitate flawless developer testing
  console.log('\n==================================================')
  console.log('📬 [EMAIL MOCK] Verification Link Dispatched')
  console.log(`To:   ${email}`)
  console.log(`Link: ${verifyLink}`)
  console.log('==================================================\n')
}

/**
 * Dispatches a password recovery token link.
 * Falls back to printing URLs to terminal stdout to bypass mail servers in development.
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${appUrl}/reset-password/${token}`

  // 1. Attempt to send via Resend
  if (resend) {
    try {
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: 'Reset your SecureGate password',
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #111827;">
            <h2 style="font-size: 20px; font-weight: bold;">Reset your SecureGate password</h2>
            <p style="margin-top: 16px; font-size: 14px; color: #4b5563;">
              You have requested a password reset. Please click the button below to configure a new password.
            </p>
            <div style="margin-top: 24px;">
              <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
              If the button doesn't work, copy and paste this URL into your browser: <br />
              <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
            </p>
            <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
              This password reset link expires in 1 hour.
            </p>
          </div>
        `,
      })
    } catch (error) {
      console.error('[EMAIL_RESET_RESEND_ERROR] Resend sending failed:', error)
    }
  }

  // 2. Always fallback/log to stdout to facilitate flawless developer testing
  console.log('\n==================================================')
  console.log('📬 [EMAIL MOCK] Password Reset Link Dispatched')
  console.log(`To:   ${email}`)
  console.log(`Link: ${resetLink}`)
  console.log('==================================================\n')
}
