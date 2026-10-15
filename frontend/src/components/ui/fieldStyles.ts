/** Shared form control styles, so every input, select and textarea matches. */
export const fieldLabelClass = 'label flex flex-col gap-1.5 text-text-primary'

export const fieldInputClass =
  'body min-h-11 rounded-control border border-border-strong bg-surface-card px-3 text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-focus-ring focus:ring-2 focus:ring-primary-200 disabled:bg-surface-muted disabled:text-text-disabled'

export const fieldTextareaClass = `${fieldInputClass} min-h-28 py-2.5`

export const fieldHintClass = 'helper text-text-tertiary'

export const fieldErrorClass = 'helper font-medium text-danger-fg'
