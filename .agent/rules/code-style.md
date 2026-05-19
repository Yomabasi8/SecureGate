---
trigger: always_on
---

# Code Style Rules — SecureGate

## Language: TypeScript (Strict)

All files are `.ts` or `.tsx`. The TypeScript compiler runs in strict mode.

```json
// tsconfig.json (required settings)
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Rule:** Never use `any`. If you cannot type something, use `unknown` and narrow it. If a third-party library forces `any`, wrap it and add a comment explaining why.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|------------|---------|
| Files (components) | PascalCase | `LoginForm.tsx` |
| Files (utils/lib) | kebab-case | `rate-limit.ts` |
| Files (routes) | Next.js convention | `route.ts`, `page.tsx` |
| React components | PascalCase | `PasswordStrengthIndicator` |
| Functions | camelCase | `generateVerificationToken()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Types/Interfaces | PascalCase, no `I` prefix | `UserSession`, `ApiResponse` |
| Zod schemas | camelCase with `Schema` suffix | `loginSchema`, `registerSchema` |
| Database fields | camelCase (Prisma convention) | `emailVerified`, `createdAt` |
| Environment vars | SCREAMING_SNAKE_CASE | `NEXTAUTH_SECRET` |

---

## File Structure (per file)

Order within a file:

1. Imports (external libraries first, then internal)
2. Type/interface definitions
3. Constants
4. Main export (component or function)
5. Helper functions (below the main export)

```typescript
// 1. External imports
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// 2. Internal imports
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'

// 3. Types
interface RegisterResponse {
  success: boolean
  message: string
}

// 4. Constants
const SALT_ROUNDS = 12

// 5. Schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// 6. Main export
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ...
}
```

---

## Import Aliases

Use the `@/` alias for all internal imports. Never use relative paths that go up more than one level.

```typescript
// ✅ Correct
import { db } from '@/lib/db'
import { LoginForm } from '@/components/auth/LoginForm'

// ❌ Wrong
import { db } from '../../../lib/db'
import { LoginForm } from '../../components/auth/LoginForm'
```

Configure in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## React Component Rules

### Server vs Client Components

Default to **Server Components**. Only add `'use client'` when the component needs:
- Browser APIs (`window`, `document`)
- React hooks (`useState`, `useEffect`, `useRef`)
- Event handlers that require interactivity

```typescript
// Server Component (no directive needed — this is the default)
export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  return <div>Welcome, {session?.user?.name}</div>
}

// Client Component (directive required)
'use client'
import { useState } from 'react'

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  // ...
}
```

### Component Signature

Always type props explicitly. Never use inline object types for complex prop shapes — extract them.

```typescript
// ✅ Correct
interface PasswordStrengthProps {
  password: string
  className?: string
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthProps) {
  // ...
}

// ❌ Wrong
export function PasswordStrengthIndicator({ password, className }: { password: string; className?: string }) {
  // ...
}
```

---

## Error Handling

### Server-Side (API Routes)

Every API route wraps its body in `try/catch`. The catch block:
- Logs the error server-side with context
- Returns a generic message to the client
- Never exposes the error object

```typescript
} catch (error) {
  console.error('[REGISTER_POST]', error)
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 }
  )
}
```

### Client-Side (Forms)

Use `try/catch` around `fetch` calls. Display user-facing messages from the API response, not the raw error.

```typescript
try {
  const res = await fetch('/api/register', { method: 'POST', body: JSON.stringify(data) })
  const json = await res.json()
  if (!res.ok) {
    setError(json.error ?? 'Something went wrong')
    return
  }
  // success path
} catch {
  setError('Network error. Please check your connection.')
}
```

---

## Async/Await

Always use `async/await`. Never use `.then()/.catch()` chains in application code (only in config files where top-level await is unavailable).

---

## Comments

Write comments that explain **why**, not **what**. The code explains what. The comment explains why the decision was made.

```typescript
// ✅ Good comment — explains why
// We return a success response even if the email doesn't exist.
// Leaking email existence would allow attackers to enumerate registered users.
return NextResponse.json({ message: 'If this email exists, a reset link has been sent.' })

// ❌ Bad comment — restates the code
// Return JSON response
return NextResponse.json({ message: '...' })
```

---

## Environment Variable Access

Never access `process.env` in component files. Create a typed config object in `src/lib/config.ts`:

```typescript
// src/lib/config.ts
export const config = {
  resendApiKey: process.env.RESEND_API_KEY!,
  nextAuthSecret: process.env.NEXTAUTH_SECRET!,
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY!,
  flutterwaveWebhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET!,
  appUrl: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
} as const
```

Use `config.resendApiKey` in `lib/email.ts`, not `process.env.RESEND_API_KEY` scattered throughout the codebase.

---

## Zod Validation Schemas

All schemas live in `src/lib/validations.ts`. Never define a schema inline inside a route handler.

```typescript
// src/lib/validations.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
```

---

## Git Commit Convention

```
feat: add email verification flow
fix: correct token expiry check in reset-password route
security: add rate limiting to login endpoint
refactor: extract token generation to lib/tokens.ts
chore: update prisma schema with PasswordResetToken model
docs: complete REFLECTION.md Q1–Q5
```

---

## What "Clean Code" Means in This Project

A file is clean when:

1. A new reader can understand its purpose in 10 seconds from the filename and first 5 lines.
2. Every function does exactly one thing.
3. No function is longer than 40 lines without a comment explaining why.
4. No unused imports, no console.log left in production code (use structured logging).
5. No magic numbers — constants are named.
6. TypeScript is satisfied without `// @ts-ignore`.
