import { CheckCircle2, CircleAlert, CircleDashed, Clock3, Sparkles, XCircle } from 'lucide-react'

export type StatusTone = 'active' | 'completed' | 'failed' | 'inProgress' | 'invited' | 'neutral' | 'pending' | 'recommendation' | 'warning'

interface StatusBadgeProps {
  label: string
  tone: StatusTone
}

const toneClasses: Record<StatusTone, string> = {
  active: 'border-green-200 bg-green-50 text-green-800',
  completed: 'border-green-200 bg-green-50 text-green-800',
  failed: 'border-red-200 bg-red-50 text-red-800',
  inProgress: 'border-blue-200 bg-blue-50 text-blue-800',
  invited: 'border-violet-200 bg-violet-50 text-violet-800',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  recommendation: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
}

const toneIcons: Record<StatusTone, typeof CheckCircle2> = {
  active: CheckCircle2,
  completed: CheckCircle2,
  failed: XCircle,
  inProgress: CircleDashed,
  invited: Clock3,
  neutral: CircleDashed,
  pending: Clock3,
  recommendation: Sparkles,
  warning: CircleAlert,
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const Icon = toneIcons[tone]
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}><Icon aria-hidden="true" size={14} />{label}</span>
}
