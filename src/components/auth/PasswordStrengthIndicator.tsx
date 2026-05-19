import * as React from 'react'
import { cn } from '@/lib/utils'

type StrengthLevel = 'weak' | 'fair' | 'strong' | 'empty'

function getStrength(password: string): StrengthLevel {
  if (!password) return 'empty'
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score <= 4) return 'fair'
  return 'strong'
}

export function PasswordStrengthIndicator({ password, id }: { password: string; id?: string }) {
  const strength = getStrength(password)

  const bars = {
    empty: { count: 0, color: 'bg-gray-200', label: 'None' },
    weak: { count: 1, color: 'bg-red-500', label: 'Weak' },
    fair: { count: 2, color: 'bg-yellow-400', label: 'Fair' },
    strong: { count: 3, color: 'bg-green-500', label: 'Strong' },
  }

  const current = bars[strength]

  return (
    <div id={id} className="space-y-2 mt-2 w-full text-left">
      <div className="flex items-center justify-between text-xs font-medium text-gray-500">
        <span>Password strength</span>
        <span
          className={cn(
            strength === 'weak' && 'text-red-500',
            strength === 'fair' && 'text-yellow-600',
            strength === 'strong' && 'text-green-600'
          )}
        >
          {current.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={cn(
              'h-1.5 rounded-full transition-colors duration-300',
              index < current.count ? current.color : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <ul className="text-xs text-gray-500 space-y-1.5 mt-2" aria-live="polite">
        <li className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          At least 8 characters
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              /[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          Contains uppercase letter
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              /[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          Contains number
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              /[^A-Za-z0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          Contains special character
        </li>
      </ul>
    </div>
  )
}
