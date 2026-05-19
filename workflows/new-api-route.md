# Playbook — Creating a New API Route

This playbook defines the exact step-by-step developer checklist when creating or modifying backend API routes in SecureGate. Follow this flow strictly to ensure absolute type safety, input defense, and zero-leak security.

---

## Step 1: Pre-Implementation Planning

Before writing any route controller files:
- [ ] **Read the Rules:** Review `.agent/rules/architecture.md` and `skills/api-route-scaffolder/SKILL.md`.
- [ ] **Target Path Co-location:** Ensure the route folder is nested under `src/app/api/[endpoint]/` and contains `route.ts`. Never mix Pages Router syntax or place handlers outside `src/app/api/`.
- [ ] **Method Design:** Determine the allowed HTTP verbs (e.g. `POST` only) and design standard requests/responses.

---

## Step 2: Formulating the Zod Schema

All data parsing must be guided by a schema defined in `src/lib/validations.ts`:
- [ ] **No Inline Schemas:** Do not define validation schemas directly inside the route handler. Add them to `src/lib/validations.ts` and import them.
- [ ] **Type Coercion Warnings:** Ensure emails use `.email()` and passwords/tokens specify strict constraints (lengths, characters).

---

## Step 3: Scaffolding the Controller Shell

Implement the boilerplate route handler with proper error coverage and rate limits:
- [ ] **Enforce Rate Limits First:** Extract client IP using `req.headers.get('x-forwarded-for')` and execute the rate limiter *before* running expensive operations (like parsing JSON or hitting the database).
- [ ] **Strict Payload Validation:** Use `schema.safeParse` to inspect request body data.
  * If `.success` is false, immediately return `400 Bad Request` with structured validations errors.
  * Extrapolate variables strictly from the safe `parsed.data` container. Never read from raw body after validation.
- [ ] **Prisma Singleton Connection:** Leverage only `db` imported from `@/lib/db`. Never import or construct a new `PrismaClient` instance inline, to prevent hot-reload connection exhaust.

---

## Step 4: Applying Security Assertions

Crosscheck that no information leaks through the endpoint responses:
- [ ] **Try-Catch Envelope:** Verify that the handler body is fully enclosed in a `try-catch` wrapper.
- [ ] **Auth Response Masking:** For authentication routines, ensure email/password check failures return identical messages and HTTP codes.
- [ ] **Reset Response Masking:** Verify forgot-password endpoints return standard successful outputs even if the request email does not exist.
- [ ] **No System Stack Leaks:** Verify that caught errors log to the server terminal with clear prefixes (`console.error('[API_ROUTE]', error)`), and that the client only receives a clean, generic server message.

---

## Step 5: Verification & Testing

- [ ] **Lint and Type Check:** Ensure compilation runs perfectly with zero warnings.
- [ ] **Confirm Return Codes:**
  * Success matches `200 OK` or `201 Created`.
  * Client format/schema errors return `400 Bad Request`.
  * Unauthenticated attempts return `401 Unauthorized`.
  * Exhausted attempts return `429 Too Many Requests`.
  * Caught code-level throws yield generic `500 Internal Server Error`.
