# Playbook — Creating a New Component

This playbook defines the exact lifecycle and steps required to introduce a new React component into the SecureGate workspace. Follow this flow strictly for every UI development task.

---

## Step 1: Pre-Implementation Planning

Before writing any lines of code:
- [ ] **Read the Rules:** Review `.agent/rules/design-system.md` and `skills/component-builder/SKILL.md`.
- [ ] **Define Boundaries:** Decide if this is a **Server Component** (default) or a **Client Component** (interactivity, hooks, event handlers required). If interactive, ensure the `'use client'` directive is at the very top.
- [ ] **Type Props Explicitly:** Define the prop interface block separately at the top of the file rather than using inline object declarations.

---

## Step 2: Structure & Core Scaffolding

- [ ] Create the component file under the appropriate path:
  * `src/components/ui/` for primitive, highly reusable utilities (inputs, buttons, spinners).
  * `src/components/auth/` for authentication card workflows.
  * `src/components/payment/` for billing and upgrade workflows.
- [ ] Use **PascalCase** for the filename and component signature.
- [ ] Use named exports:
  ```typescript
  export function MyComponent({ propA }: MyComponentProps) { ... }
  ```
- [ ] If importing internal items, use the `@/` import alias. Never write complex relative paths going higher than one directory (e.g. `../../../lib`).

---

## Step 3: Visual & Interactive Layout (Tailwind)

- [ ] Use Tailwind utility classes exclusively. Never introduce custom CSS styles in your components.
- [ ] Apply harmonious spacing constraints:
  * Forms spacing: `space-y-4`
  * Layout offsets: `mt-6`
  * Component padding: `py-2.5 px-4`
  * Rounded cards: `rounded-2xl`
  * Smaller widgets: `rounded-lg`
- [ ] Integrate dark mode/default contrasts carefully:
  * Headings: `text-gray-900`
  * Core body text: `text-gray-600`
  * Backgrounds: `bg-white` or `bg-gray-50`
- [ ] Bind focus indicator loops (`focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`).

---

## Step 4: Loading & Feedback States

- [ ] For async submission buttons:
  * Wire up the standard disabled state (`disabled={isLoading || disabled}`).
  * Display a clear, distinct visual spinner or status text (like the standard `Button` spinner) to block double clicks.
- [ ] For card/page notifications:
  * Use the standard message alerts (green for success, red for failures).
  * Include screen reader rules (`role="alert"`).

---

## Step 5: Self-Review & Verification

Run a final visual and code-level checklist:
- [ ] **Keyboard Navigable:** Can this component be focused and operated entirely using `Tab` and `Enter/Space` keys?
- [ ] **No Secrets:** Ensure zero credentials, keys, or endpoints are hardcoded anywhere inside the component file.
- [ ] **Zero `any` Uses:** TypeScript compilation runs successfully with zero warnings and no `any` annotations.
