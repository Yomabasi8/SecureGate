---
trigger: always_on
---

# Architecture Rules — SecureGate

## System Overview

SecureGate is a standalone Next.js 14 App Router application. It is not a microservice. It is not a monorepo. It has one job: authentication and access management. Every architectural decision must serve that job without drifting into unrelated concerns (Zawinski's Law warning).

---

## App Router Structure

Use the Next.js 14 App Router exclusively. Do not mix Pages Router patterns.

```
src/app/
├── (auth)/                  ← Route group, no layout impact on URL
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── verify-email/[token]/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/[token]/page.tsx
├── dashboard/
│   └── page.tsx             ← Protected; middleware enforces access
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── register/route.ts
│   ├── verify-email/route.ts
│   ├── forgot-password/route.ts
│   ├── reset-password/route.ts
│   └── payment/
│       ├── initiate/route.ts
│       └── webhook/route.ts
└── layout.tsx               ← Root layout with SessionProvider
```

### Route Group Rationale

The `(auth)` route group exists to apply a shared auth layout (card wrapper, logo, no nav) without adding `/auth/` to the URL path. The URL `/login` is cleaner than `/auth/login` for a user-facing product.

---

## Layer Responsibilities

### `src/lib/` — Pure Logic, No React

Each file in `lib/` has one responsibility. Do not mix concerns.

| File | Responsibility |
|------|----------------|
| `auth.ts` | NextAuth configuration, `authOptions`, `getServerSession` wrapper |
| `db.ts` | Prisma client singleton (prevent hot-reload connection leaks) |
| `email.ts` | Resend client, `sendVerificationEmail()`, `sendPasswordResetEmail()` |
| `rate-limit.ts` | Rate limiter factory, IP extraction, limit check helpers |
| `tokens.ts` | `generateToken()`, `hashToken()`, expiry helpers |
| `validations.ts` | All Zod schemas — one source of truth for input shapes |

**Rule:** API routes import from `lib/`. They do not contain business logic themselves. An API route is a thin controller: validate → call lib → return response.

### `src/components/` — UI Only

Components must not call Prisma directly. They must not call Resend directly. They receive data as props or fetch from API routes.

```
components/
├── ui/          ← Primitive, reusable: Button, Input, FormField, PasswordStrength
├── auth/        ← Feature components: LoginForm, SignupForm, ForgotPasswordForm
└── payment/     ← Flutterwave button wrapper, payment status display
```

### `src/emails/` — React Email Templates

Email templates are React components rendered server-side by Resend. They are not Next.js pages.

### `src/middleware.ts` — Edge Guard

The middleware file runs at the edge before any page renders. It is the single place where route protection and rate limiting decisions are made for page routes. API route protection is handled per-route with `getServerSession`.

---

## Database Architecture

### Prisma as the ORM

Use Prisma for all database access. Raw SQL is not permitted unless Prisma cannot express the query (document the reason if so).

**Prisma singleton pattern — required to prevent connection pool exhaustion during hot reload:**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

### Schema Models

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String    // bcrypt hash only, never plain text
  emailVerified DateTime?
  isPremium     Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model VerificationToken {
  identifier String   // user email
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model PasswordResetToken {
  email   String
  token   String   @unique
  expires DateTime

  @@unique([email, token])
}
```

> **Leaky Abstraction Note:** Prisma's `@@unique` compound index maps to a `UNIQUE` constraint in PostgreSQL — not a primary key. The `VerificationToken` model does not have an `id` field because it mirrors NextAuth's built-in adapter schema. If you switch to a database adapter session strategy, NextAuth will expect this exact shape. Understanding the layer beneath Prisma matters here.

---

## Session Strategy

Use **JWT sessions** (not database sessions) for this project.

**Justification:** Database sessions require a `Session` table and an `Account` table in the Prisma schema (NextAuth adapter requirement). JWT sessions store the payload in a signed, encrypted cookie — no extra DB round trip on every request. For a single-server auth app without multi-device session revocation requirements, JWT is the simpler, correct choice. Justify this decision in `REFLECTION.md Q2`.

---

## Middleware Architecture

```typescript
// src/middleware.ts
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

This is the minimum viable middleware. It delegates auth checking to NextAuth's built-in middleware handler. If rate limiting needs to run at the edge (for Upstash Redis), wrap the default export:

```typescript
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Additional checks (e.g., emailVerified) can go here
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token && !!token.emailVerified,
    },
  }
)
```

---

## API Route Pattern

Every API route must follow this pattern. No exceptions.

```typescript
// src/app/api/[endpoint]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const schema = z.object({ /* ... */ })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    // Business logic here
    // ...

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[ENDPOINT_ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
```

**Rules:**
- Always use `safeParse`, not `parse` — catch validation errors without throwing.
- Always wrap in `try/catch` — never let an unhandled error reach the client.
- Never return the raw `error` object or stack trace.
- Log errors server-side with a descriptive prefix for debugging.

---

## Security Headers (next.config.js)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

---

## Conway's Law Reflection

The folder structure above directly mirrors the mental model of a solo full-stack developer building an auth system:

- `lib/` = the way the developer thinks about logic: auth, database, email, rate limiting, tokens — each a separate mental model.
- `components/` = the way the developer thinks about UI: primitives first, then feature-specific.
- `app/` = the way the developer thinks about pages: auth flows grouped, dashboard separate, API routes co-located.

If this were a team project, the folder structure would change to match team boundaries. One team owns `app/api/`, another owns `components/`. The code structure would reflect the communication structure of the team. That is Conway's Law in practice.
