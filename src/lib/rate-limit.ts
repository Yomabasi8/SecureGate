import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Upstash Redis if environment secrets exist
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

let loginRateLimiter: Ratelimit | null = null
let forgotRateLimiter: Ratelimit | null = null

if (redisUrl && redisToken) {
  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })

    // Sign in rate limiter: 5 attempts per 10 minutes
    loginRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      prefix: 'securegate:signin',
    })

    // Forgot password rate limiter: 3 attempts per 1 hour
    forgotRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      prefix: 'securegate:forgot-password',
    })
  } catch (error) {
    console.error('[RATELIMIT_INITIALIZATION_ERROR] Failed to initialize Upstash Redis:', error)
  }
}

// In-Memory Fallback Map with TTL tracking
const inMemoryCache = new Map<string, { count: number; resetAt: number }>()

/**
 * Validates request count matching IP address and target action.
 * Returns success validation alongside the window reset epoch timestamp.
 */
export async function checkRateLimit(
  ip: string,
  action: 'signin' | 'forgot-password'
): Promise<{ success: boolean; reset: number }> {
  const isSignIn = action === 'signin'
  const maxAttempts = isSignIn ? 5 : 3
  const windowMs = isSignIn ? 10 * 60 * 1000 : 60 * 60 * 1000 // 10 mins or 1 hour
  const cacheKey = `${action}:${ip}`

  // 1. Attempt Upstash production rate limit validation
  if (isSignIn && loginRateLimiter) {
    try {
      const result = await loginRateLimiter.limit(cacheKey)
      return { success: result.success, reset: result.reset }
    } catch (error) {
      console.error('[RATELIMIT_UPSTASH_SIGNIN_ERROR]', error)
    }
  } else if (!isSignIn && forgotRateLimiter) {
    try {
      const result = await forgotRateLimiter.limit(cacheKey)
      return { success: result.success, reset: result.reset }
    } catch (error) {
      console.error('[RATELIMIT_UPSTASH_FORGOT_ERROR]', error)
    }
  }

  // 2. Fallback to in-memory tracking in dev/sandbox environments
  const now = Date.now()
  const record = inMemoryCache.get(cacheKey)

  // Clear expired cache entries
  if (record && now > record.resetAt) {
    inMemoryCache.delete(cacheKey)
  }

  const activeRecord = inMemoryCache.get(cacheKey)

  if (!activeRecord) {
    const resetAt = now + windowMs
    inMemoryCache.set(cacheKey, { count: 1, resetAt })
    return { success: true, reset: resetAt }
  }

  if (activeRecord.count >= maxAttempts) {
    return { success: false, reset: activeRecord.resetAt }
  }

  activeRecord.count++
  return { success: true, reset: activeRecord.resetAt }
}
