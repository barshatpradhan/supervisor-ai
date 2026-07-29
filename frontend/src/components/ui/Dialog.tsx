import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface DialogProps {
  children: ReactNode
  description?: string
  title: string
}

export function Dialog({ children, description, title }: DialogProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-950/35 data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[min(100%-2rem,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border-subtle bg-surface-card p-6 shadow-shell focus:outline-none">
        <div className="flex items-start justify-between gap-4">
          <div><DialogPrimitive.Title className="text-xl font-semibold text-text-primary">{title}</DialogPrimitive.Title>{description ? <DialogPrimitive.Description className="mt-1 text-sm text-text-secondary">{description}</DialogPrimitive.Description> : null}</div>
          <DialogPrimitive.Close aria-label="Close dialog" className="rounded-md p-1 text-text-secondary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary-500"><X aria-hidden="true" size={18} /></DialogPrimitive.Close>
        </div>
        <div className="mt-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
