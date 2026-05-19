# API Route Scaffolder Skill — SecureGate

This document specifies the mandatory structural design and hardening parameters for all backend API routes in SecureGate. Any route added to `src/app/api/` must strictly match this blueprint.

---

## 1. Core API Structure

Every API route must implement a clean, standard controller structure inside its `route.ts` file:
* **Controller Isolation:** The route handler serves as a thin transport boundary. Do not inject complex logic. Validate the input using Zod, delegate logic to `src/lib/`, and emit the response.
* **Global Error Wrapping:** Wrap the entire block inside a standard `try-catch` envelope to capture uncaught middleware or system errors.

### The Shell Template
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

// 1. Zod schema for exact input shapes
const requestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
})

export async function POST(req: NextRequest) {
  try {
    // 2. Extract client IP and enforce rate limiting
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const identifier = `api:login:${ip}`
    const { allowed } = await rateLimit(identifier, 5, 10 * 60 * 1000) // 5 attempts per 10m

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in 10 minutes.' },
        { status: 429 }
      )
    }

    // 3. Parse and validate body
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // 4. Safe Business Execution
    const { email, password } = parsed.data
    // ... logic ...

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    // 5. Hardened Server Logs (No Client Leak)
    console.error('[ROUTE_ERROR_PREFIX]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
```

---

## 2. Hardened Security Constraints

### Input Validation
* **Use `safeParse` Only:** Never execute `schema.parse()`, as an unhandled validation throw bypasses custom error masking.
* **Strict Parameter Extraction:** Never pass the raw `req.body` directly down to database calls or services. Extrapolate strictly from `parsed.data`.

### Error Masking (Zero Data Leaks)
* **Never Expose Internal Details:** Never return stack traces, Postgres query logs, or ORM messages to the client. Keep production responses generic (`status: 500` = `"Something went wrong. Please try again."`).
* **Brute-Force & Account Enumeration Shielding:**
  * **Auth Failures:** Return `"Invalid email or password."` (`status: 401`) regardless of whether the email mismatch or password mismatch caused the fail. Never hint at matching profiles.
  * **Forgot Password Verification:** Return success regardless of whether the submitted email actually exists inside the database. Send emails in the background only when the email is successfully found.
  * **Token Exceptions:** Return `"This link is invalid or has already been used."` (`status: 400`) if a token is not found or is expired. Do not distinguish between missing tokens and expired tokens to avoid revealing database states.

### Rate Limiting Specs
Ensure correct rate limiting identifiers based on IP:
* **Login/Verify Routes:** Max **5 requests per 10 minutes** per IP.
* **Password Reset Requests:** Max **3 requests per 1 hour** per IP.
