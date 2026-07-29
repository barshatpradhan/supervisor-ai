import * as DialogPrimitive from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { FormField } from '../../../components/ui/FormField'
import { queryKeys } from '../../../lib/api/queryKeys'
import { assignProjectRecommendation } from '../../../services/recommendations/recommendationService'
import type { BackendRecommendation, BackendTask } from '../../../types/backend'

const assignmentSchema = z.object({
  mode: z.enum(['existing', 'new']),
  taskId: z.string(),
  title: z.string().max(200, 'Task title must be 200 characters or fewer.'),
  description: z.string().max(5000, 'Description must be 5,000 characters or fewer.'),
  priority: z.enum(['low', 'medium', 'high']),
  estimatedHours: z.coerce.number().min(0.25, 'Estimated hours must be at least 0.25.'),
  dueDate: z.string(),
}).superRefine((value, context) => {
  if (value.mode === 'existing' && !value.taskId) {
    context.addIssue({ code: 'custom', message: 'Select a task.', path: ['taskId'] })
  }
  if (value.mode === 'new' && !value.title.trim()) {
    context.addIssue({ code: 'custom', message: 'Task title is required.', path: ['title'] })
  }
})

type AssignmentValues = z.infer<typeof assignmentSchema>

interface RecommendationAssignmentDialogProps {
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
  projectId: string
  recommendation: BackendRecommendation
  recommendationRunId: string
  tasks: BackendTask[]
}

export function RecommendationAssignmentDialog({ onOpenChange, open, organizationId, projectId, recommendation, recommendationRunId, tasks }: RecommendationAssignmentDialogProps) {
  const queryClient = useQueryClient()
  const [successTask, setSuccessTask] = useState<BackendTask | null>(null)
  const form = useForm<AssignmentValues>({
    defaultValues: { mode: 'existing', taskId: '', title: '', description: '', priority: 'medium', estimatedHours: 1, dueDate: '' },
    resolver: zodResolver(assignmentSchema),
  })
  const mutation = useMutation({
    mutationFn: (values: AssignmentValues) => assignProjectRecommendation(projectId, {
      recommendationRunId,
      employeeId: recommendation.employeeId,
      ...(values.mode === 'existing'
        ? { taskId: values.taskId }
        : { task: { title: values.title.trim(), description: values.description.trim() || undefined, priority: values.priority, estimatedHours: values.estimatedHours, dueDate: values.dueDate || undefined } }),
    }),
    onSuccess: async (result) => {
      setSuccessTask(result.task)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.detail(organizationId, projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(organizationId, projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.project(organizationId, projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.supervisor(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.employee(organizationId) }),
      ])
    },
  })
  const mode = form.watch('mode')
  const availableTasks = tasks.filter((task) => task.project_id === projectId && !task.assigned_employee_id)

  return <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}><Dialog description="Choose an existing task or create one. Recommendation scores are not changed by this action." title={`Assign ${recommendation.fullName}`}><div aria-live="polite" className="space-y-5">
    {successTask ? <div className="space-y-4"><div className="rounded-lg border border-success-fg/30 bg-success-bg p-4 text-success-text"><h3 className="font-semibold">Employee assigned successfully</h3><p className="mt-1 text-sm">{successTask.title} is now assigned to {recommendation.fullName}.</p></div><DialogPrimitive.Close asChild><Button>Done</Button></DialogPrimitive.Close></div> : <>
      <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4 text-sm text-ink-700"><p><strong>Recommendation score:</strong> {recommendation.score}</p><p className="mt-1"><strong>Availability:</strong> {recommendation.availabilityPercentage}% · <strong>Workload:</strong> {recommendation.workloadPercentage}%</p><p className="mt-2 text-ink-600">This recommendation is advisory. Review the task details before confirming assignment.</p></div>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <fieldset><legend className="text-sm font-semibold text-ink-900">Assignment mode</legend><div className="mt-2 flex flex-wrap gap-4 text-sm"><label className="inline-flex items-center gap-2"><input {...form.register('mode')} type="radio" value="existing" /> Existing task</label><label className="inline-flex items-center gap-2"><input {...form.register('mode')} type="radio" value="new" /> Create task</label></div></fieldset>
        {mode === 'existing' ? <label className="grid gap-2 text-sm font-medium text-ink-900">Task<select aria-describedby={form.formState.errors.taskId ? 'assignment-task-error' : undefined} {...form.register('taskId')} className="min-h-10 rounded-md border border-border-subtle bg-surface-card px-3"><option value="">Select a task</option>{availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title} — {task.status} — {task.priority}</option>)}</select>{form.formState.errors.taskId ? <span id="assignment-task-error" role="alert" className="text-sm text-danger-700">{form.formState.errors.taskId.message}</span> : null}{availableTasks.length === 0 ? <span className="text-sm text-ink-600">No unassigned tasks are available for this project.</span> : null}</label> : <><FormField error={form.formState.errors.title?.message} label="Task title" {...form.register('title')} /><FormField label="Description" {...form.register('description')} /><label className="grid gap-2 text-sm font-medium text-ink-900">Priority<select {...form.register('priority')} className="min-h-10 rounded-md border border-border-subtle bg-surface-card px-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><FormField error={form.formState.errors.estimatedHours?.message} label="Estimated hours" min="0.25" step="0.25" type="number" {...form.register('estimatedHours')} /><FormField label="Due date" type="date" {...form.register('dueDate')} /></>}
        {mutation.error ? <ErrorState error={mutation.error} onRetry={() => mutation.reset()} title="Assignment failed" /> : null}
        <div className="flex justify-end gap-3"><DialogPrimitive.Close asChild><Button disabled={mutation.isPending} variant="secondary">Cancel</Button></DialogPrimitive.Close><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Assigning…' : 'Confirm assignment'}</Button></div>
      </form>
    </>}
  </div></Dialog></DialogPrimitive.Root>
}
