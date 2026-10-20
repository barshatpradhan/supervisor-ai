import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes, type Ref } from 'react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  ref?: Ref<HTMLInputElement>
}

/**
 * A password field with a show/hide toggle. Pass the same props as an <input>;
 * the toggle sits inside the right edge of the field.
 */
export function PasswordInput({ className = '', disabled, ref, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <span className="relative flex">
      <input
        {...props}
        className={`${className} w-full pr-11`}
        disabled={disabled}
        ref={ref}
        type={isVisible ? 'text' : 'password'}
      />
      <button
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-text-tertiary transition hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled}
        onClick={() => setIsVisible((current) => !current)}
        title={isVisible ? 'Hide password' : 'Show password'}
        type="button"
      >
        {isVisible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
      </button>
    </span>
  )
}
