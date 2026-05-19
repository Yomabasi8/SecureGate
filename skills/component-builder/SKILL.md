# Component Builder Skill — SecureGate

This guide specifies how to build and style React UI components for the SecureGate application, ensuring absolute fidelity to our design system, type safety, and rigorous accessibility standards.

---

## 1. Technical Framework

### Tailwind CSS Styling
* **Utility Classes Only:** Never write custom CSS files. Use Tailwind classes exclusively.
* **Inline styles:** Avoid inline `style` props unless styling dynamic values calculated by JavaScript (e.g. dynamic element width or positioning).
* **Class Names Union:** Use a utility function like `cn` (built on `clsx` and `tailwind-merge`) to merge classes dynamically:
  ```typescript
  import { type ClassValue, clsx } from "clsx"
  import { twMerge } from "tailwind-merge"

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  ```

### Server vs Client Components
* **Default to Server Components:** All layouts and pages must be Server Components.
* **Use `'use client'` strategically:** Add `'use client'` only to interactive controls containing event handlers, hooks (`useState`, `useEffect`, `useContext`), or browser APIs.
* Keep client components nested at the leaf node level to minimize Javascript bundle size.

---

## 2. Core Token Applications

### Tailwind Color Mapping
Use only these Tailwind classes to represent our color system:
* **Brand Primary:** `bg-blue-600` / `text-blue-600` (hover: `hover:bg-blue-700` / `hover:text-blue-700`)
* **Brand Light:** `bg-blue-50` / `text-blue-800`
* **Neutral Dark:** `text-gray-900` / `bg-gray-900`
* **Neutral Body:** `text-gray-600`
* **Neutral Border:** `border-gray-200`
* **Neutral Background:** `bg-gray-50`
* **Success:** `bg-green-50` / `border-green-200` / `text-green-800` / `text-green-600`
* **Error:** `bg-red-50` / `border-red-200` / `text-red-800` / `text-red-600`

### Typography Mappings (Inter Font)
* **Page Title:** `text-2xl font-bold text-gray-900`
* **Card Heading:** `text-xl font-semibold text-gray-900`
* **Body Text:** `text-base font-normal text-gray-600`
* **Form Labels:** `text-sm font-medium text-gray-700`
* **Helper/Error Text:** `text-xs text-red-600` or `text-xs text-gray-500`
* **Placeholders:** `placeholder:text-gray-400`

---

## 3. UI Component Blueprints

### Accessible Input Field
Always wrap inputs with distinct labels, error structures, and `aria` descriptions:

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export const InputField = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, helperText, required, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
        <input
          id={id}
          ref={ref}
          className={cn(
            "w-full px-3 py-2.5 border rounded-lg text-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "placeholder:text-gray-400",
            error
              ? "border-red-300 bg-red-50 text-red-900 focus:ring-red-500"
              : "border-gray-300 bg-white text-gray-900",
            className
          )}
          aria-describedby={
            error ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          aria-invalid={!!error}
          required={required}
          {...props}
        />
        {error ? (
          <p id={`${id}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${id}-helper`} className="text-xs text-gray-500">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
InputField.displayName = "InputField"
```

### Loading State Button
Never permit silent form submissions. Always display spinner animations and disable interactions:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({
  children,
  isLoading,
  variant = 'primary',
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle = "w-full font-medium py-2.5 px-4 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
  }

  return (
    <button
      className={cn(baseStyle, variants[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
```

### Password Strength Indicator (Signup Page Only)
```tsx
type StrengthLevel = 'weak' | 'fair' | 'strong'

export function getPasswordStrength(password: string): StrengthLevel {
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

export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null

  const strength = getPasswordStrength(password)
  const colors = {
    weak: 'bg-red-500 w-1/3',
    fair: 'bg-yellow-400 w-2/3',
    strong: 'bg-green-500 w-full'
  }

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex justify-between items-center text-xs font-medium">
        <span className="text-gray-500">Password strength</span>
        <span className={cn(
          strength === 'weak' ? 'text-red-500' : strength === 'fair' ? 'text-yellow-600' : 'text-green-600'
        )}>
          {strength.toUpperCase()}
        </span>
      </div>
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-300", colors[strength])} />
      </div>
      <ul className="text-xs text-gray-500 space-y-1 pt-1">
        <li className="flex items-center gap-1.5">
          <span>{checks.length ? "✓" : "—"}</span> At least 8 characters
        </li>
        <li className="flex items-center gap-1.5">
          <span>{checks.upper ? "✓" : "—"}</span> Contains uppercase letter
        </li>
        <li className="flex items-center gap-1.5">
          <span>{checks.number ? "✓" : "—"}</span> Contains number
        </li>
      </ul>
    </div>
  )
}
```

---

## 4. Accessibility Checklists

All components must comply with WCAG 2.1 AA benchmarks:
1. **Interactive Focus:** Focus states must be distinct. Never use `focus:outline-none` unless replacing it with robust visible focus rings (`focus:ring-2 focus:ring-blue-500`).
2. **Color Contrast:** Never use color alone to convey state or error. Use text captions and icons alongside color boundaries.
3. **Screen Readers:** Add `role="alert"` on message alerts or dynamic field error lines so they are announced upon render.
4. **Keyboard Accessibility:** Use appropriate HTML tags (`<button>`, `<a>`, `<input>`) rather than binding click event listeners to custom `<div>` nodes.
