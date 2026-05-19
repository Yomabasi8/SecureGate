# SecureGate — Agent Configuration

## Project Identity

**Project:** SecureGate  
**Type:** Focused Authentication & Security App (Standalone Next.js)  
**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL · NextAuth.js · Resend · Tailwind CSS · Flutterwave  
**Deployment:** Vercel  
**Assessment:** Dev & Design — Design to MVP Bootcamp Live Task

---

## What This Project Is

SecureGate is not a full product. It is a production-grade authentication system built as a standalone Next.js app. Its single responsibility is identity and access management: sign up, login, email verification, password reset, session protection, and rate limiting.

A premium dashboard unlock via **Flutterwave** payment is included as an extension of the auth layer.

---

## Agent Behaviour Rules

### Always

- Read the relevant rule file in `.agents/rules/` before touching a domain (security, design, code style, architecture).
- Read the relevant skill file in `skills/` before scaffolding a new component, API route, or database migration.
- Follow the workflow in `workflows/` when creating a new component or API route.
- Treat every field coming from the client as untrusted. Validate with Zod on the server side before touching the database.
- Use environment variables for all secrets. Never hardcode keys, tokens, or credentials.
- Hash passwords with `bcryptjs` at salt round 12. Never store plain text or reversible hashes.
- Expire all tokens. Verification tokens expire in 15 minutes. Password reset tokens expire in 1 hour.
- Return generic error messages on auth failures. Never confirm whether an email exists in a public-facing response.

### Never

- Never commit `.env.local` or any file containing real secrets.
- Never store session secrets, API keys, or database credentials in source code.
- Never use `SHA-256` or any fast hash for passwords.
- Never return stack traces, internal error messages, or database errors to the client.
- Never skip input validation on an API route, even if the field looks safe.
- Never bypass rate limiting middleware on auth endpoints.
- Never write `any` in TypeScript unless explicitly justified with a comment.
- Never add a feature that is not in the current phase scope (YAGNI).

---

## Project Phases (in order)

| Phase | Focus |
|-------|-------|
| 1 | Scaffold & Database Schema |
| 2 | Authentication Core with NextAuth |
| 3 | Email Verification Flow |
| 4 | Forgot Password Flow |
| 5 | Rate Limiting & Security Hardening |
| 6 | UI Polish & Deployment |

Do not scaffold phase 3 code inside phase 1. Complete each phase before starting the next. A broken phase 2 on a shaky phase 1 is worse than a solid phase 1 alone (Gall's Law).

---

## Folder Structure

```
securegate/
├── AGENTS.md                  ← This file
├── REFLECTION.md              ← Required for submission
├── .agents/
│   └── rules/
│       ├── architecture.md
│       ├── code-style.md
│       ├── design-system.md
│       └── security.md
├── skills/
│   ├── flutterwave-integration/
│   │   ├── SKILL.md
│   │   └── resources/
│   │       └── webhook-handler.ts
│   ├── component-builder/
│   │   └── SKILL.md
│   ├── api-route-scaffolder/
│   │   └── SKILL.md
│   └── db-migration-runner/
│       └── SKILL.md
├── workflows/
│   ├── new-component.md
│   └── new-api-route.md
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── verify-email/[token]/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/[token]/
│   │   ├── dashboard/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── register/
│   │   │   ├── verify-email/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── payment/
│   │   │       ├── initiate/
│   │   │       └── webhook/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── auth/
│   │   └── payment/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── email.ts
│   │   ├── rate-limit.ts
│   │   ├── tokens.ts
│   │   └── validations.ts
│   ├── emails/
│   │   ├── verification-email.tsx
│   │   └── password-reset-email.tsx
│   └── middleware.ts
└── next.config.js
```

---

## Engineering Laws This Agent Must Internalise

| Law | Where It Applies in SecureGate |
|-----|-------------------------------|
| **Murphy's Law** | Rate limiting, token expiry, session edge cases, missing fields |
| **Kerckhoffs's Principle** | bcrypt hashing, env vars for secrets, no security by obscurity |
| **YAGNI** | Build only what each phase requires |
| **Gall's Law** | Scaffold in phases; simple working system first |
| **Leaky Abstractions** | Understand Prisma, NextAuth, and Resend at the layer beneath |
| **Boy Scout Rule** | Leave every file cleaner than you found it |
| **Postel's Law** | Accept diverse inputs gracefully; be strict in what you emit |
| **Least Surprise** | Error messages must match user expectations |
| **Conway's Law** | Folder structure reflects the architecture of the system |
| **Technical Debt** | Document any shortcut taken and why |

---

## Environment Variables Reference

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY
FLUTTERWAVE_SECRET_KEY
FLUTTERWAVE_WEBHOOK_SECRET
```

All variables must be configured in the Vercel dashboard. None may appear in source code.

---

## Submission Checklist (Agent Must Verify Before Done)

- [ ] App live on Vercel
- [ ] Sign up creates a verified user in the DB
- [ ] Passwords are bcrypt hashes in the database (starts with `$2b$`)
- [ ] Verification email sends and link works
- [ ] Forgot password flow works end to end
- [ ] Rate limiting blocks after 5 failed login attempts
- [ ] `/dashboard` redirects unauthenticated users to `/login`
- [ ] `.env.local` is NOT in the GitHub repo
- [ ] `REFLECTION.md` is in the repo root with all 15 questions answered
- [ ] No hardcoded API keys or secrets anywhere in the codebase
- [ ] All environment variables set in Vercel dashboard
- [ ] UI has loading states and real, specific error messages
