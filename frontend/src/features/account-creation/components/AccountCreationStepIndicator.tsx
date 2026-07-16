import type { AccountCreationStep } from '../types/accountCreation'

interface AccountCreationStepIndicatorProps {
  currentStepLabel: string
  steps: AccountCreationStep[]
}

export function AccountCreationStepIndicator({
  currentStepLabel,
  steps,
}: AccountCreationStepIndicatorProps) {
  return (
    <div aria-label={`Account creation steps. Current step: ${currentStepLabel}`} className="rounded-xl border border-border-subtle bg-surface-card-alt p-4">
      <ol className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => {
          const statusClasses =
            step.status === 'current'
              ? 'border-primary-200 bg-primary-50 text-primary-700'
              : step.status === 'complete'
                ? 'border-success-100 bg-success-50 text-success-700'
                : 'border-border-subtle bg-surface-card text-ink-600'

          return (
            <li
              aria-current={step.status === 'current' ? 'step' : undefined}
              className={`rounded-lg border p-3 ${statusClasses}`}
              key={step.id}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{step.label}</p>
                  <p className="mt-1 text-xs leading-5 opacity-90">{step.description}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
