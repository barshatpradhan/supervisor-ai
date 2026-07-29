import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label: string
}

export function FormField({ error, id, label, ...inputProps }: FormFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <label className="grid gap-2 text-sm font-medium text-text-primary" htmlFor={inputId}>
      {label}
      <input aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} className="min-h-10 rounded-md border border-border-subtle bg-surface-card px-3 text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" id={inputId} {...inputProps} />
      {error ? <span className="text-sm text-red-700" id={errorId} role="alert">{error}</span> : null}
    </label>
  )
}
