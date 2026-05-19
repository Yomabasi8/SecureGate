---
trigger: always_on
---

# Security Rules — SecureGate

## Core Security Principle

SecureGate's security must come from the **strength of its implementation**, not the secrecy of its design (Kerckhoffs's Principle). Every security mechanism must work even if an attacker has read every line of code. The only things that must stay secret are: the database password, the NextAuth secret, the Resend API key, and the Flutterwave secret key — all stored in environment variables, never in code.

---

## Password Security

### Hashing — Non-negotiable Rules

1. **Always use bcrypt** via the `bcryptjs` npm package (pure JavaScript — no native binaries to compile).
2. **Salt rounds must be 12**. This is the minimum for production. Do not use 10 (too fast) or 14+ (too slow for a 3-hour assessment — 12 is the documented correct choice).
3. **Never store plain text passwords**. If a user's password column starts with anything other than `$2b$`, the system is broken.
4. **Never use SHA-256, MD5, or any fast hashing algorithm** for passwords. Fast = vulnerable to brute force. Bcrypt is slow by design.
5. **Never roll your own crypto**. Use the established libraries exactly as documented.

```typescript
// src/lib/auth.ts — Hashing on registration
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}
```

**Why 12 rounds?** Bcrypt's cost factor is exponential. Round 10 = ~100ms per hash, round 12 = ~400ms, round 14 = ~1.5s. At 12 rounds, a GPU brute-forcing 10,000 bcrypt hashes per second would take centuries to crack a strong password. A legitimate user waits ~400ms — acceptable. An attacker trying millions of guesses per second — impossible.

**What SHA-256 does wrong:** SHA-256 is a fast hash. A modern GPU can compute 10 billion SHA-256 hashes per second. Every password in your database could be cracked against a rainbow table in hours. Bcrypt's salt means every hash is unique — no precomputed table works.

---

## Token Security

### Verification Tokens

```typescript
// src/lib/tokens.ts
import crypto from 'crypto'

export function generateToken(): string {
  // 32 bytes = 256 bits of entropy = cryptographically secure
  return crypto.randomBytes(32).toString('hex')
}

export function getVerificationTokenExpiry(): Date {
  // 15 minutes from now
  return new Date(Date.now() + 15 * 60 * 1000)
}

export function getPasswordResetTokenExpiry(): Date {
  // 1 hour from now
  return new Date(Date.now() + 60 * 60 * 1000)
}

export function isTokenExpired(expires: Date): boolean {
  return new Date() > expires
}
```

**Rules:**
- Verification tokens expire in **15 minutes**.
- Password reset tokens expire in **1 hour**.
- Delete tokens immediately after use. A token that has been consumed must not be reusable.
- If a token is not found in the database, return the same error as if the token were expired. Do not distinguish between "token not found" and "token expired" — both get the same generic message.
- Never expose raw tokens in logs.

### Token URL Pattern

```
https://yourapp.vercel.app/verify-email/[token]
https://yourapp.vercel.app/reset-password/[token]
```

The token is the full 64-character hex string from `crypto.randomBytes(32).toString('hex')`. It is compared against the stored token using `===` (exact match). Never use partial matching.

---

## Email Enumeration Protection

**The forgot-password endpoint must return a success response regardless of whether the email exists.**

```typescript
// CORRECT — attacker learns nothing
export async function POST(req: NextRequest) {
  const { email } = await req.json()
  const user = await db.user.findUnique({ where: { email } })

  // Whether the user exists or not, we return the same response.
  // We only send the actual email if the user exists.
  if (user) {
    const token = generateToken()
    await savePasswordResetToken(email, token)
    await sendPasswordResetEmail(email, token)
  }

  // Same response in both cases
  return NextResponse.json({
    message: 'If this email is registered, you will receive a reset link shortly.',
  })
}

// WRONG — attacker can enumerate registered emails
if (!user) {
  return NextResponse.json({ error: 'Email not found' }, { status: 404 })
}
```

**Why this matters:** If your endpoint returns "Email not found" when an email isn't registered, an attacker can enumerate every email in your database by automating requests. They now have a list of valid accounts to target.

---

## Authentication Error Messages

**The login endpoint must return the same error whether the email is wrong or the password is wrong.**

```typescript
// CORRECT
return NextResponse.json(
  { error: 'Invalid email or password.' },
  { status: 401 }
)

// WRONG — tells attacker the email is correct
return NextResponse.json(
  { error: 'Incorrect password.' },
  { status: 401 }
)

// WRONG — confirms which emails are registered
return NextResponse.json(
  { error: 'No account found with this email.' },
  { status: 404 }
)
```

---

## Rate Limiting

### Login Endpoint

Maximum **5 attempts per IP address per 10-minute window**.

```typescript
// Using Upstash Redis + @upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  analytics: true,
  prefix: 'securegate:login',
})

// In the login route or middleware:
const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
const identifier = `login:${ip}`
const { success, reset } = await ratelimit.limit(identifier)

if (!success) {
  const resetDate = new Date(reset)
  return NextResponse.json(
    { error: 'Too many login attempts. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': resetDate.toISOString(),
      },
    }
  )
}
```

### Forgot Password Endpoint

Maximum **3 requests per IP per hour**. Password reset emails are expensive (spam risk, Resend quota) and don't need to be fast.

### Rate Limit Fallback (No Upstash)

If Upstash Redis is not available, use an in-memory Map with a TTL:

```typescript
// src/lib/rate-limit.ts — in-memory fallback
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = attempts.get(identifier)

  if (!record || now > record.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: maxAttempts - record.count }
}
```

**Warning:** In-memory rate limiting resets on every server restart and does not work across multiple Vercel instances. Use Upstash Redis for production. Document this limitation in REFLECTION.md Q14 as a piece of technical debt.

---

## Input Validation

**Every API route must validate its input with Zod before touching the database.**

```typescript
const parsed = schema.safeParse(body)

if (!parsed.success) {
  return NextResponse.json(
    { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
    { status: 400 }
  )
}

// Only use parsed.data from here — never use body directly
const { email, password } = parsed.data
```

**Rule:** Never trust `req.body` directly. Zod validation ensures:
- Types match what the code expects
- Required fields are present
- String lengths are within bounds (preventing overflow attacks)
- Email format is valid (reducing garbage data)

---

## HTTP Security Headers

These headers must be set in `next.config.js`:

```javascript
{
  key: 'X-Frame-Options',
  value: 'DENY',
  // Prevents clickjacking — stops SecureGate from being embedded in an iframe
},
{
  key: 'X-Content-Type-Options',
  value: 'nosniff',
  // Prevents MIME type sniffing — browser must respect declared content-type
},
{
  key: 'Referrer-Policy',
  value: 'strict-origin-when-cross-origin',
  // Prevents token leakage via Referer header when navigating to external sites
},
{
  key: 'X-XSS-Protection',
  value: '1; mode=block',
  // Legacy header — still useful for older browsers
},
```

---

## Session Security (NextAuth)

### JWT Secret

The `NEXTAUTH_SECRET` must be:
- At least 32 characters
- Generated with `openssl rand -base64 32`
- Never the same between environments (development ≠ production)
- Rotated immediately if it is ever exposed

**What happens if NEXTAUTH_SECRET is leaked:**
1. An attacker can forge valid session JWTs
2. They can create a signed token claiming to be any user in your database
3. They can set `emailVerified: true`, `isPremium: true`, or any other session field
4. Every active user session is compromised — all must be invalidated
5. Recovery requires: generate a new secret → deploy → all existing sessions are immediately invalid (users must log in again)

### Session Payload

Extend the NextAuth session type to include `emailVerified` and `isPremium`:

```typescript
// types/next-auth.d.ts
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
```

---

## Environment Variable Checklist

| Variable | Where Used | If Leaked |
|----------|-----------|-----------|
| `DATABASE_URL` | Prisma | Full database access — rotate immediately |
| `NEXTAUTH_SECRET` | NextAuth JWT signing | Forge any session — rotate, all sessions invalid |
| `NEXTAUTH_URL` | NextAuth redirects | Low risk, but don't expose |
| `RESEND_API_KEY` | Email sending | Attacker can send emails as you — rotate |
| `FLUTTERWAVE_SECRET_KEY` | Payment API | Financial fraud — rotate immediately |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Webhook verification | Fake payment events — rotate immediately |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Rate limit bypass — rotate |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting auth | Rate limit bypass — rotate |

**Recovery procedure if any secret is committed to GitHub:**
1. Assume it is compromised the moment it hits a public repo (bots scrape GitHub within seconds).
2. Rotate the secret in the relevant service immediately (not after investigating — immediately).
3. Update the value in Vercel environment variables.
4. Redeploy.
5. For `NEXTAUTH_SECRET`: notify users their sessions have been invalidated and they must log in again.
6. Review Git history — use `git filter-branch` or BFG Repo Cleaner to purge the secret from history.
7. Force-push the cleaned history.

---

