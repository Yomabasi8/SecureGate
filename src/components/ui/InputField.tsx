import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  helperText?: string
  required?: boolean
  ariaDescribedBy?: string
}

export const InputField = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, helperText, required, ariaDescribedBy, className, ...props }, ref) => {
    return (
      <div className="space-y-1 w-full text-left">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder:text-gray-400',
            error
              ? 'border-red-300 bg-red-50 text-red-900 focus:ring-red-500'
              : 'border-gray-300 bg-white text-gray-900',
            className
          )}
          aria-describedby={
            ariaDescribedBy
              ? `${ariaDescribedBy}${error ? ` ${id}-error` : ''}`
              : error
                ? `${id}-error`
                : helperText
                  ? `${id}-helper`
                  : undefined
          }
          aria-invalid={!!error}
          required={required}
          {...props}
        />
        {error ? (
          <p id={`${id}-error`} className="text-xs text-red-600 mt-1" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${id}-helper`} className="text-xs text-gray-500 mt-1">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

InputField.displayName = 'InputField'
