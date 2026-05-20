# SecureGate — Reflection & Engineering Analysis

**Name:** Yomabasi Fortune Bassey
**Cohort:** Design to MVP Bootcamp
**Live URL:** https://secure-gate-mu.vercel.app
**GitHub Repo:** https://github.com/Yomabasi8/SecureGate

---

## Part 1 — What I Built

I built SecureGate, a production-grade authentication and identity management application with Next.js 14, Prisma, PostgreSQL, and NextAuth.js. It handles the full authentication lifecycle from user registration with email verification .

## Part 2 — What Surprised Me

The hardest part was getting the database connection to work in production. My local PostgreSQL worked perfectly, but moving to Supabase on Vercel introduced issues with connection poolers, URL-encoded passwords containing special characters, and Prisma timing out during `db push`. I learned that "it works on my machine" is a real engineering problem — localhost and production are completely different environments with different network rules, SSL requirements, and connection limits.

## Part 3 — Engineering Laws Quiz

### Q1 — Murphy's Law

**Code reference:** `src/lib/auth.ts` lines 22-28 and `src/lib/tokens.ts` lines 22-27

**My Answer:** Murphy's Law forced me to add protection in two places I would not have thought about otherwise. First, the email verification check in the authorize function — I assumed users would always verify their email before trying to log in. But Murphy says a user will try to log in the second after they register, before opening their email. If I had not added the `if (!user.emailVerified)` check on line 48 of auth.ts, that user would get into the dashboard with an unverified account, breaking the core verification flow. Second, the token expiry check — I assumed users would click verification links immediately. Murphy says they will click it three hours later. The 15-minute expiry check in tokens.ts line 24 (`new Date(Date.now() + 15 * 60 * 1000)`) and the validation in the verify-email page (`if (new Date() > tokenRecord.expires)`) catches this and shows the user a clear "link expired" message with a resend option instead of a confusing blank error.

**What goes wrong if ignored:** Without the email verification guard, unverified users could access protected routes. Without token expiry, stolen tokens from years ago could still activate accounts, which is a massive security hole.

### Q2 — Law of Leaky Abstractions

**Code reference:** `src/lib/email.ts` lines 4-5 and `src/lib/db.ts` lines 7-11

**My Answer:** NextAuth's CredentialsProvider abstraction leaked the hardest. The abstraction promises a simple `authorize` function where you return a user object or throw an error. But it quietly swallows errors in production — when I threw `new Error('Please verify your email before signing in.')`, NextAuth turned it into a generic `CredentialsSignin` error in the URL query parameter. I had to read the NextAuth source code to understand that errors thrown in `authorize` are encoded into the `?error=` query parameter, and I had to build my own client-side parsing in LoginForm.tsx lines 19-31 to extract the real message. The abstraction also does not handle rate limiting — I had to inject that myself by reading the raw request headers for the IP address, which is not part of the NextAuth API at all. The abstraction helped me get started fast, but when I needed real security, I had to go underneath it.

**What goes wrong if ignored:** Users would see a generic "Invalid email or password" error even when the real problem is unverified email or too many attempts, making the app frustrating and unhelpful.

### Q3 — YAGNI

**Code reference:** `src/app/api/payment/` (does not exist yet)

**My Answer:** SecureGate deliberately stops at authentication. Social login (Google, GitHub OAuth), multi-factor authentication (TOTP), and audit logs are all features that sound important but would have added massive complexity for zero value right now. Social login would require setting up OAuth apps on each provider, handling different callback patterns, and storing social provider IDs in the schema. MFA would need TOTP secret generation, QR code rendering, backup codes, and a recovery flow. Audit logs would need a separate database table and an indexing strategy. None of these are required for a user to sign up, verify their email, reset their password, and access a dashboard — which is the entire scope of this project. Adding them now would violate YAGNI because we do not yet know if users even want or need these features. When the time comes, each feature would be added as a separate phase: social login by adding NextAuth providers and a `SocialAccount` model, MFA by generating TOTP secrets with a library like `otplib` and storing them on the User model, and audit logs by creating an `AuditEvent` table and hooking into critical mutations.

**What goes wrong if ignored:** Building features nobody asked for wastes weeks of development time, introduces bugs in the core auth flow, and makes the codebase harder to navigate and maintain.

### Q4 — Kerckhoffs's Principle

**Code reference:** `src/app/api/register/route.ts` line 38 and `src/lib/auth.ts` line 42

**My Answer:** A salt is a random string added to a password before hashing, ensuring that identical passwords produce different hashes. bcrypt generates a unique salt automatically and includes it in the output hash (the `$2b$` format you see in the database). In my code, `await bcrypt.hash(password, 12)` uses 12 salt rounds, meaning bcrypt runs 2^12 = 4096 iterations internally. If I stored SHA-256 hashes instead — a fast hash designed for checksums, not passwords — an attacker with a rainbow table of common passwords could reverse most hashes instantly. SHA-256 hashes the same password to the same value every time, and with commodity GPUs, an attacker can compute billions of SHA-256 hashes per second. bcrypt's 12 rounds of salting and slow computation mean an attacker can only try a few passwords per second, making brute force impractical. Kerckhoffs's principle says the algorithm should be public knowledge — bcrypt is open and well-studied, and the security comes from the salt and work factor, not from hiding how the hashing works.

**What goes wrong if ignored:** A database breach would expose all user passwords within hours or minutes instead of years, leading to account takeover across the app and on other services where users reuse passwords.

### Q5 — Postel's Law + Security by Design

**Code reference:** `src/app/api/forgot-password/route.ts` lines 40-50

**My Answer:** The forgot-password endpoint always returns the same success message — "If this email address is registered, you will receive a password reset link shortly." — regardless of whether the email exists in the database. On line 41, the code only generates a token and sends an email `if (user)`. But the success response on line 46 is returned whether the user existed or not. This is governed by Postel's Law: "be conservative in what you send." The response is intentionally vague because revealing whether an email is registered leaks user information. An attacker could scrape the endpoint to build a list of valid email addresses for phishing attacks. The same principle applies to the login endpoint — both incorrect email and incorrect password return the exact same message: "Invalid email or password."

**What goes wrong if ignored:** If the error message changed based on email existence, an attacker could enumerate registered users by trying different emails and observing different responses, then target those users with phishing or credential stuffing attacks.

### Q6 — The Boy Scout Rule

**Code reference:** `src/components/auth/ForgotPasswordForm.tsx` and `src/components/auth/ResendVerificationForm.tsx`

**My Answer:** While working on the accessibility improvements, I noticed the `ForgotPasswordForm` and `ResendVerificationForm` had duplicate error display patterns — identical SVG icons, the same red border styling, and repeated `role="alert"` attributes. This was not part of the original plan (the task was just to add autoComplete attributes), but I extracted the logic into the shared `InputField` component which already had error display built in. I then standardized all success banners across all forms by adding `role="status"` so screen readers announce success transitions. The Boy Scout Rule says leave the code cleaner than you found it — even if the ticket did not ask for it, the codebase is measurably better for future developers who will work on these forms.

**What goes wrong if ignored:** Duplicated UI patterns lead to inconsistent styling over time — one form gets updated but the others are missed, creating a fragmented user experience.

### Q7 — Gall's Law

**Code reference:** Project folder structure (`src/app/(auth)/`, `src/app/api/`, `src/lib/`)

**My Answer:** SecureGate was built in six sequential phases: scaffold and database schema first, then authentication core, then email verification, then forgot password, then rate limiting, then UI polish. This matches Gall's Law perfectly — a complex system that works evolved from a simple system that worked. Phase 1 was just Prisma schema and Next.js setup with no auth logic. Phase 2 added login/signup with NextAuth. Phase 3 layered email verification on top of that working auth. Each phase depended on the previous one. If I had tried to build all six phases at once — adding social login, MFA, audit logs, payment integration, and real-time notifications in a single sprint — the debugging surface area would have been massive. A bug in the Prisma schema would be indistinguishable from a bug in the email template or the rate limiter. The app would never have reached a working state because too many things would break simultaneously with no clear root cause.

**What goes wrong if ignored:** Building everything at once guarantees nothing works. Bugs compound because you cannot tell if a failure is in the database layer, the auth layer, or the payment layer. You end up with a broken system that nobody can debug.

### Q8 — Law of Leaky Abstractions (ORMs)

**Code reference:** `prisma/schema.prisma` lines 10-19 (User model) and the generated Prisma client

**My Answer:** Prisma's `@updatedAt` attribute on the `updatedAt` field (line 18) looks like a simple Prisma feature — just add the decorator and Prisma handles the timestamp automatically. But the abstraction leaks because Prisma does not actually use database-level triggers or `ON UPDATE CURRENT_TIMESTAMP`. Instead, it reads the current timestamp from the JavaScript runtime and includes it in the UPDATE query. This means if you update the database outside of Prisma (via a direct SQL query, a migration tool, or another ORM), `updatedAt` will not update automatically. Another leak: the `String?` type on `name` (nullable) maps to an optional field in Prisma queries, but in the actual PostgreSQL table, it is simply a nullable `TEXT` column — there is no database-level distinction between "not provided" (undefined) and "explicitly set to null." The Prisma client treats them differently in TypeScript, but the database treats them identically.

**What goes wrong if ignored:** A developer runs a manual SQL UPDATE on the production database and wonders why `updatedAt` never changed. Or they write a migration script in raw SQL and the Prisma schema becomes out of sync with the actual database structure.

### Q9 — Zawinski's Law

**Code reference:** `src/lib/rate-limit.ts` lines 1-92

**My Answer:** Rate limiting is not built into Next.js or NextAuth. I had to add it myself using Upstash Redis with an in-memory fallback. This demonstrates that authentication frameworks handle "who you are" but do not handle "how fast you can knock." Zawinski's Law says "every program attempts to expand until it can read mail" — meaning software naturally grows beyond its original purpose. If SecureGate grew without discipline, it would eventually try to become a full identity platform with user management dashboards, admin panels, team management, billing, and notifications. The rate limiter was a deliberate boundary: it does exactly one thing (blocks excessive requests by IP) and does it well. Without discipline, the `rate-limit.ts` file would grow into a complex throttling system with per-user limits, per-endpoint limits, global limits, and a configuration dashboard — all before the core auth flow even works reliably.

**What goes wrong if ignored:** Apps that grow without discipline accumulate features that compete with the core purpose, making them slow, confusing, and impossible to maintain. The auth system becomes an identity platform before the login button works properly.

### Q10 — The Principle of Least Surprise

**Code reference:** `src/components/auth/LoginForm.tsx` lines 56-65

**My Answer:** The login form shows "Invalid email or password." for both wrong email and wrong password. I chose this specific wording because it matches what users expect from every login form they have ever used — Gmail, Twitter, GitHub, all of them say something similar. The Principle of Least Surprise says software should behave in ways users find predictable. A user who mistypes their password expects to see something like "wrong password," not a detailed error like "the email exists but the password hash does not match." Also, showing different messages for "email not found" versus "wrong password" would surprise the user in a bad way — they would learn whether their email is registered, which is information an attacker can exploit. The single message is both predictable and secure.

**What goes wrong if ignored:** If error messages were too specific ("User with this email does not exist"), attackers could enumerate valid accounts. If they were too vague ("Error"), users would be confused and frustrated.

### Q11 — Murphy's Law + Defensive Programming

**Code reference:** `src/middleware.ts` lines 4-13 and `src/lib/auth.ts` lines 63-77

**My Answer:** The middleware checks the NextAuth JWT token from the session cookie. On line 10: `authorized: ({ token }) => !!token && !!token.emailVerified`. It first checks if a token exists (the user is authenticated) and then checks if `emailVerified` is a truthy value (not null). If a user manually deletes their session cookie, the middleware cannot read the token — `token` will be `null`. The `!!token` check on line 10 evaluates to `false`, so `authorized` returns `false`, and the user is redirected to `/login` (configured as the signIn page on line 13 of auth.ts). The JWT callback on lines 63-77 also defensively re-fetches from the database on every token refresh — `const dbUser = await db.user.findUnique(...)` — so if a user was verified or upgraded to premium after their token was issued, the token is silently updated with fresh data. This is Murphy's Law in action: assume the worst (deleted cookies, stale tokens, database changes) and handle it gracefully.

**What goes wrong if ignored:** Without the `!!token` check, a missing cookie would crash the middleware instead of redirecting to login. Without the database re-fetch in the JWT callback, a user who verifies their email after signing in would stay locked out until their old token expires.

### Q12 — Kerckhoffs's Principle + Technical Debt

**Code reference:** `.gitignore` line 30 (`.env`) and `src/lib/auth.ts` line 90

**My Answer:** If `NEXTAUTH_SECRET` was accidentally committed to GitHub, an attacker would have the key used to sign all JWT session tokens. Step by step: (1) the attacker clones the repo and finds the secret in the git history. (2) They decode any user's JWT from the session cookie (JWTs are base64-encoded, not encrypted). (3) They forge a new JWT with arbitrary payload — setting `emailVerified` to a valid date and `isPremium` to true. (4) They set this forged cookie in their browser and access `/dashboard` as any user. The recovery process: immediately rotate `NEXTAUTH_SECRET` in the `.env` file and Vercel environment variables. This invalidates all existing sessions — every logged-in user will be forced to sign in again. Then remove the secret from git history using `git filter-branch` or `BFG Repo-Cleaner`, and add `.env` to `.gitignore` if not already there. Kerckhoffs's principle says security must not rely on the algorithm being secret — the algorithm (JWT with HS256) is public, so the key must be kept secret. This is security debt: the leak happened because the `.env` file was not gitignored early enough.

**What goes wrong if ignored:** Without immediate rotation, an attacker can forge sessions for any user, access premium features without paying, and escalate privileges arbitrarily. The security debt compounds because every minute the old key remains valid increases exposure.

### Q13 — Conway's Law

**Code reference:** Project folder structure (`src/app/(auth)/`, `src/app/api/`, `src/components/auth/`, `src/lib/`)

**My Answer:** My folder structure mirrors how I think about the system: authentication pages in `(auth)/`, API routes in `api/`, reusable components in `components/auth/`, and business logic in `lib/`. This is Conway's Law in action — the system I built reflects the mental model of the builder. I think of authentication as having three layers: the presentation layer (pages and forms), the API layer (routes that handle requests), and the logic layer (tokens, emails, rate limiting). The folder structure separates these concerns exactly. A developer who thinks of auth as "just a login button" would have everything in one file. A developer who thinks of it as a distributed system would split auth into microservices. The structure of my SecureGate code is a direct output of how I organized the problem in my head before writing a single line of code.

**What goes wrong if ignored:** A team without a shared mental model ends up with chaotic folder structures — auth logic in page files, database queries in components, API routes with inline HTML. The code becomes impossible to navigate and every new feature requires fighting the existing structure.

### Q14 — Technical Debt

**Code reference:** `src/lib/rate-limit.ts` lines 37-91 (in-memory fallback)

**My Answer:** The in-memory rate limiter in `rate-limit.ts` works perfectly on a single server but will fail on Vercel's serverless architecture. Vercel runs each request on a different Lambda instance, so the in-memory cache (a simple JavaScript Map on line 37) is not shared across instances. A user could hit 5 login attempts on instance A, then switch to instance B and get 5 fresh attempts because instance B has an empty cache. The debt exists because I did not have an Upstash Redis instance configured — the production Redis path is there (lines 53-66), but it requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment variables. The refactored version would make Redis required in production and fall back to the in-memory cache only in development:

```typescript
export async function checkRateLimit(ip: string, action: 'signin' | 'forgot-password') {
  const isSignIn = action === 'signin'
  const cacheKey = `${action}:${ip}`

  if (loginRateLimiter || forgotRateLimiter) {
    const limiter = isSignIn ? loginRateLimiter : forgotRateLimiter
    if (limiter) {
      const result = await limiter.limit(cacheKey)
      return { success: result.success, reset: result.reset }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[RATELIMIT_CONFIG_ERROR] Redis not configured in production')
    return { success: true, reset: Date.now() + 60000 }
  }

  // In-memory fallback for development only
  ...
}
```

I left it because setting up Upstash Redis requires an account, a new database, and more environment variables — debt I chose to accept so I could ship the rate-limiting feature without blocking on infrastructure setup.

**What goes wrong if ignored:** On Vercel's serverless infrastructure, the rate limiter becomes ineffective because each Lambda instance has its own memory. An attacker can bypass the limit by sending requests across different instances.

### Q15 — Synthesis Question

**Code reference:** All files (`src/app/api/payment/`, `src/lib/auth.ts`, `src/middleware.ts`)

**My Answer:** Adding Flutterwave payment integration would invoke every engineering principle from this task, but some become critically more important when money is involved. Murphy's Law becomes the most critical — if a user pays and the premium flag is not set, or if the webhook fires twice and the user gets charged twice, that is real financial damage. I would use idempotency keys on the payment initiation endpoint and a database transaction around the premium flag update. Kerckhoffs's principle becomes second most critical — the webhook secret (`FLUTTERWAVE_WEBHOOK_SECRET`) must never leak because anyone who has it can forge webhook events and grant themselves premium access for free. The webhook handler would verify the signature header on every request. YAGNI keeps me from building a full billing dashboard, subscription management, invoice generation, or refund flow — I only need "user pays once → user gets premium = true." Postel's Law says the webhook handler should be strict about what it accepts (validate the signature, validate the amount, validate the currency) but generous about what it returns (always return 200 OK to Flutterwave even on processing errors, so they do not retry webhooks unnecessarily). The Principle of Least Surprise says the user should see immediate feedback after payment — the dashboard should show premium features within seconds of a successful payment, not after a page refresh or a 24-hour delay.

**What goes wrong if ignored:** Without idempotency, users get charged multiple times. Without webhook signature verification, attackers can forge premium access. Without proper error handling, users pay but never get their premium features, destroying trust in the product.

## Part 4 — One Thing I Would Refactor

The rate limiter's in-memory fallback cache is a ticking time bomb. On Vercel's serverless architecture, each request hits a different Lambda instance with its own memory. The `inMemoryCache` Map on line 37 of `rate-limit.ts` is never shared, so the rate limiter is functionally disabled in production. The refactored version would make the production Redis path the only path in production and give a clear configuration error if Redis is missing:

```typescript
export async function checkRateLimit(ip: string, action: 'signin' | 'forgot-password')
  : Promise<{ success: boolean; reset: number }> {
  const isSignIn = action === 'signin'
  const cacheKey = `${action}:${ip}`

  if (isSignIn && loginRateLimiter) {
    return await loginRateLimiter.limit(cacheKey)
  }
  if (!isSignIn && forgotRateLimiter) {
    return await forgotRateLimiter.limit(cacheKey)
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Rate limiting requires Upstash Redis in production')
  }

  // Development in-memory fallback
  ...
}
```

This would fail loudly in production if Redis is not configured, instead of silently bypassing security.

## Part 5 — How This Changes How I Build

Before building SecureGate, I thought authentication was just a login form that checked a username and password. Now I understand it is a system of interconnected concerns: password hashing is not just encryption but a deliberate trade-off between security and speed, rate limiting is not optional but as fundamental as password checking, email verification is not a nice-to-have but a protection against fake accounts and spam, and error messages are not just UX copy but security boundaries that prevent information leakage. I now think about every piece of user-facing software through the lens of these engineering laws — not as academic concepts but as practical guardrails that prevent real disasters. The next app I build will start with a solid auth foundation not because it is impressive, but because everything else depends on it.
