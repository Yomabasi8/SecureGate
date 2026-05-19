---
trigger: always_on
---

# Design System Rules — SecureGate

## Design Philosophy

SecureGate is a security product. Its design must communicate trust, clarity, and competence. Every UI decision should reduce cognitive load and increase user confidence. This is not a place for decorative complexity.

**Three principles:**
1. **Clarity over cleverness** — users must always know what to do next
2. **Feedback over silence** — every action must produce a visible response
3. **Consistency over creativity** — reuse patterns; do not invent new ones per page

---

## Tech Stack: Tailwind CSS

Use Tailwind CSS utility classes only. No custom CSS files except for global resets and font imports in `app/globals.css`. No inline `style` props unless Tailwind cannot express the value (e.g., dynamic pixel values from JavaScript).

---

## Colour Palette

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Brand Primary | `blue-600` | `#2563EB` | CTAs, links, focus rings |
| Brand Hover | `blue-700` | `#1D4ED8` | Button hover state |
| Brand Light | `blue-50` | `#EFF6FF` | Subtle backgrounds |
| Neutral 900 | `gray-900` | `#111827` | Headings |
| Neutral 600 | `gray-600` | `#4B5563` | Body text |
| Neutral 400 | `gray-400` | `#9CA3AF` | Placeholder text |
| Neutral 200 | `gray-200` | `#E5E7EB` | Borders, dividers |
| Neutral 50 | `gray-50` | `#F9FAFB` | Page background |
| Success | `green-600` | `#16A34A` | Success messages |
| Error | `red-600` | `#DC2626` | Error messages |
| Warning | `yellow-500` | `#EAB308` | Token expiry warnings |
| White | `white` | `#FFFFFF` | Card backgrounds |

**Password Strength Colours:**
| Strength | Colour | Tailwind |
|----------|--------|---------|
| Weak | Red | `bg-red-500` |
| Fair | Yellow | `bg-yellow-400` |
| Strong | Green | `bg-green-500` |

---

## Typography

Use the `Inter` font (import via `next/font/google`).

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

| Element | Size | Weight | Tailwind |
|---------|------|--------|---------|
| Page Title | 24px | Bold | `text-2xl font-bold` |
| Card Heading | 20px | Semibold | `text-xl font-semibold` |
| Body | 16px | Regular | `text-base font-normal` |
| Label | 14px | Medium | `text-sm font-medium` |
| Helper / Error | 13px | Regular | `text-xs` or `text-sm` |
| Placeholder | 14px | Regular | Tailwind `placeholder:` modifier |

---

## Layout

### Auth Pages

All auth pages use a centered card layout. No nav bar. No footer. Just the card.

```
┌─────────────────────────────────┐
│                                 │
│         [SecureGate Logo]       │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   Page Title              │  │
│  │   Subtitle text           │  │
│  │                           │  │
│  │   [Form content]          │  │
│  │                           │  │
│  │   [Primary CTA Button]    │  │
│  │                           │  │
│  │   Link to other auth page │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

```tsx
// Auth page wrapper
<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
  <div className="w-full max-w-md">
    {/* Logo */}
    <div className="text-center mb-8">
      <h1 className="text-2xl font-bold text-gray-900">SecureGate</h1>
      <p className="text-sm text-gray-600 mt-1">Secure by design</p>
    </div>
    {/* Card */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      {children}
    </div>
  </div>
</div>
```

### Dashboard

The dashboard uses a top nav + content area layout.

```
┌─────────────────────────────────────────┐
│  SecureGate          [User] [Logout]    │  ← Nav bar
├─────────────────────────────────────────┤
│                                         │
│  Welcome, [Name]                        │
│  Your account is verified and active.  │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │  Card 1  │  │  Card 2  │            │
│  └──────────┘  └──────────┘            │
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Specifications

### Button

```tsx
// variants: 'primary' | 'secondary' | 'ghost' | 'danger'
// sizes: 'sm' | 'md' | 'lg'
// states: default | hover | focus | disabled | loading

// Primary button
<button
  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium 
             py-2.5 px-4 rounded-lg transition-colors duration-150
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
             disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={isLoading}
>
  {isLoading ? (
    <span className="flex items-center justify-center gap-2">
      <Spinner className="w-4 h-4" />
      Loading...
    </span>
  ) : (
    label
  )}
</button>
```

**Rule:** Every button that triggers an async action must show a loading state. No silent button clicks.

### Input Field

```tsx
// Structure: Label → Input → Helper/Error message
<div className="space-y-1">
  <label
    htmlFor={id}
    className="block text-sm font-medium text-gray-700"
  >
    {label}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
  <input
    id={id}
    className={cn(
      "w-full px-3 py-2.5 border rounded-lg text-sm",
      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      "placeholder:text-gray-400 transition-colors",
      error
        ? "border-red-300 bg-red-50 text-red-900"
        : "border-gray-300 bg-white text-gray-900"
    )}
    aria-describedby={error ? `${id}-error` : undefined}
    aria-invalid={!!error}
  />
  {error && (
    <p id={`${id}-error`} className="text-xs text-red-600" role="alert">
      {error}
    </p>
  )}
  {helperText && !error && (
    <p className="text-xs text-gray-500">{helperText}</p>
  )}
</div>
```

**Rules:**
- Every input must have a visible `<label>` — never use `placeholder` as the only label.
- Error messages must be specific: "Password must be at least 8 characters" not "Invalid input".
- Use `aria-invalid` and `aria-describedby` for accessibility.

### Password Strength Indicator

Shows below the password field on the Sign Up page only.

```
Password strength
[████████░░] Fair

— At least 8 characters ✓
— Contains uppercase letter ✗
— Contains number ✓
```

```tsx
// Strength levels
type StrengthLevel = 'weak' | 'fair' | 'strong'

function getStrength(password: string): StrengthLevel {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score <= 3) return 'fair'
  return 'strong'
}

// Bar colours
const strengthColour = {
  weak: 'bg-red-500',
  fair: 'bg-yellow-400',
  strong: 'bg-green-500',
}
```

### Alert / Message Banner

For success and error messages at the form level (not field level):

```tsx
// Success
<div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
  <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
  <p className="text-sm text-green-800">{message}</p>
</div>

// Error
<div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
  <ExclamationCircleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
  <p className="text-sm text-red-800">{message}</p>
</div>
```

---

## Error Message Copy

Authentication error messages must follow the Principle of Least Surprise AND protect security.

| Scenario | Message to Show |
|----------|----------------|
| Wrong email or password | "Invalid email or password." |
| Account not verified | "Please verify your email before signing in." |
| Rate limited | "Too many attempts. Please try again in 10 minutes." |
| Expired verification token | "This link has expired. Request a new verification email." |
| Expired reset token | "This reset link has expired. Please request a new one." |
| Invalid token | "This link is invalid or has already been used." |
| Email not found (forgot password) | "If this email is registered, you'll receive a reset link." |
| Server error | "Something went wrong. Please try again." |

**Rule:** Never say "Email not found" or "Incorrect password" separately. These are two separate leaks of information.

---

## Loading States

Every async action must show a loading state. The loading state must:
1. Disable the submit button
2. Show a spinner or loading text
3. Prevent double submission

Use a `isLoading` boolean in component state, set to `true` before the fetch call and `false` in the finally block.

---

## Spacing Scale

Use Tailwind's default spacing scale consistently:

| Purpose | Class |
|---------|-------|
| Between form fields | `space-y-4` |
| Inside card | `p-8` |
| Between label and input | `space-y-1` |
| Between sections | `mt-6` |
| Button padding | `py-2.5 px-4` |
| Card border radius | `rounded-2xl` |
| Input border radius | `rounded-lg` |
| Button border radius | `rounded-lg` |

---

## Accessibility Requirements

- All interactive elements must be keyboard accessible.
- All form fields must have `id` and associated `<label htmlFor={id}>`.
- Error messages must use `role="alert"` so screen readers announce them.
- Focus ring must always be visible (never `outline-none` without a replacement `ring`).
- Colour is never the only indicator of state — use icons + text alongside colour.
- Images and icons used meaningfully must have `alt` text. Decorative icons use `aria-hidden="true"`.

---

## Responsive Breakpoints

SecureGate is primarily a desktop app but must be usable on mobile.

| Breakpoint | Width | Layout Adjustment |
|------------|-------|-------------------|
| Mobile | < 640px | Full-width card, reduced padding (`p-5`) |
| Tablet+ | ≥ 640px | Max-width card (`max-w-md`), standard padding (`p-8`) |

```tsx
// Responsive card padding
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8">
```
