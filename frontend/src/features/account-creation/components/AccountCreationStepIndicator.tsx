import { Check } from 'lucide-react'
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
    <nav aria-label={`Account creation steps. Current step: ${currentStepLabel}`}>
      <ol className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))]">
        {steps.map((step, index) => {
          const isCurrent = step.status === 'current'
          const isComplete = step.status === 'complete'

          return (
            <li
              aria-current={isCurrent ? 'step' : undefined}
              className={[
                'flex items-start gap-3 border-t-[3px] pt-3',
                isCurrent ? 'border-primary-600' : isComplete ? 'border-status-completed' : 'border-chart-grid',
              ].join(' ')}
              key={step.id}
            >
              <span
                aria-hidden="true"
                className={[
                  'num-sm inline-flex size-7 shrink-0 items-center justify-center rounded-full',
                  isCurrent
                    ? 'bg-primary-600 text-text-on-primary'
                    : isComplete
                      ? 'bg-success-bg text-success-fg'
                      : 'border border-border-strong text-text-tertiary',
                ].join(' ')}
              >
                {isComplete ? <Check size={14} /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className={['body-strong m-0', isCurrent ? 'text-text-primary' : 'text-text-secondary'].join(' ')}>
                  {step.label}
                  {isComplete ? <span className="sr-only"> (complete)</span> : null}
                </p>
                <p className="helper m-0 text-text-tertiary">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
