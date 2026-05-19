# DB Migration Runner Skill — SecureGate

This document governs modifications to our Prisma schema and PostgreSQL database schema. Safe and consistent migration practices are essential to prevent local vs production data drift and environment mismatches.

---

## 1. Database Schema Blueprint

SecureGate relies on three primary models defined in `prisma/schema.prisma`. Ensure all modifications respect their exact relations and constraint designs:

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

### Leaky Abstraction: Compound Unique Constraints
* `VerificationToken` and `PasswordResetToken` use `@@unique` compound constraints instead of primary key `id` fields.
* **Why:** In PostgreSQL, Prisma maps `@@unique` directly to standard compound `UNIQUE` database indices. This closely mirrors NextAuth's built-in adapter session schema, ensuring compatibility if we shift strategy from JWT to DB adapter-backed sessions later.

---

## 2. Step-by-Step Migration Workflow

When schema modifications (adding fields, indexes, or new models) are required:

### Step A: Model Revision
1. Read the instructions in `.agent/rules/architecture.md`.
2. Open `prisma/schema.prisma` and perform your structural updates.
3. Validate and clean format the schema syntax:
   ```bash
   npx prisma format
   ```

### Step B: Dev Schema Migration
1. Apply and generate the SQL migration file in development:
   ```bash
   npx prisma migrate dev --name <migration_name>
   ```
2. Verify that the command:
   * Creates the SQL changes file under `prisma/migrations/`.
   * Automatically executes the query against your local Postgres database.
   * Runs client generation behind the scenes (`npx prisma generate`).

### Step C: Manual Client Generation
If you alter the schema but don't perform a database migration, manually regenerate types:
```bash
npx prisma generate
```

---

## 3. Core Database Access Pattern

To avoid **connection pool exhaustion** during fast hot-reloads in Next.js development, always import the Prisma client using our global singleton wrapper from `@/lib/db`.

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

### Rules:
* **Import exclusively** from `@/lib/db`.
* Never declare `const prisma = new PrismaClient()` directly inside pages, components, or API routes.
