import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded border bg-[#0C0E12] border-[#2a2f3d] text-white placeholder-[#6b7280] transition-colors duration-200',
            'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-[#9ca3af]">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
