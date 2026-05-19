import crypto from 'crypto'
import { db } from '@/lib/db'

interface FlutterwaveWebhookPayload {
  event: string
  data: {
    id: number
    tx_ref: string
    flw_ref: string
    amount: number
    currency: string
    status: string
    customer: {
      email: string
      name?: string
    }
  }
}

/**
 * Validates a Flutterwave webhook request by checking its verif-hash signature.
 * Uses a cryptographically secure constant-time comparison to prevent timing attacks.
 * 
 * @param requestHash The `verif-hash` header received from the HTTP request.
 * @param localSecret The expected webhook secret configured in the environment.
 * @returns boolean representing signature validity.
 */
export function verifyWebhookSignature(
  requestHash: string | null,
  localSecret: string | undefined
): boolean {
  if (!requestHash || !localSecret) {
    return false
  }
  
  try {
    const requestBuffer = Buffer.from(requestHash, 'utf8')
    const secretBuffer = Buffer.from(localSecret, 'utf8')
    
    // timingSafeEqual requires buffers to have identical lengths
    if (requestBuffer.length !== secretBuffer.length) {
      return false
    }
    
    return crypto.timingSafeEqual(requestBuffer, secretBuffer)
  } catch {
    return false
  }
}

/**
 * Processes a verified Flutterwave webhook payload to unlock the premium dashboard.
 * Sets the `isPremium` flag to true in the database for the paying user.
 * 
 * @param payload The parsed webhook payload.
 * @returns Object indicating success status and result message.
 */
export async function processPremiumUpgrade(
  payload: FlutterwaveWebhookPayload
): Promise<{ success: boolean; message: string }> {
  try {
    const { event, data } = payload

    // 1. Verify this is a charge completion event
    if (event !== 'charge.completed') {
      console.warn(`[FLUTTERWAVE_WEBHOOK] Ignored unhandled event type: ${event}`)
      return { success: false, message: 'Unhandled event type' }
    }

    // 2. Validate transaction status
    if (data.status !== 'successful') {
      console.warn(`[FLUTTERWAVE_WEBHOOK] Transaction status not successful: ${data.status} for Ref: ${data.tx_ref}`)
      return { success: false, message: 'Transaction status not successful' }
    }

    const customerEmail = data.customer.email

    if (!customerEmail) {
      console.error('[FLUTTERWAVE_WEBHOOK] Customer email missing in webhook payload')
      return { success: false, message: 'Customer email missing' }
    }

    // 3. Reconcile user profile and apply isPremium update
    const user = await db.user.findUnique({
      where: { email: customerEmail }
    })

    if (!user) {
      console.error(`[FLUTTERWAVE_WEBHOOK] User not found matching email: ${customerEmail}`)
      return { success: false, message: 'Matching user not found' }
    }

    await db.user.update({
      where: { email: customerEmail },
      data: { isPremium: true }
    })

    console.info(`[FLUTTERWAVE_WEBHOOK] Successfully upgraded user ${customerEmail} to Premium. Ref: ${data.tx_ref}`)
    return { success: true, message: 'User upgraded successfully' }

  } catch (error) {
    console.error('[FLUTTERWAVE_WEBHOOK_ERROR]', error)
    return { success: false, message: 'Internal server error processing webhook' }
  }
}
