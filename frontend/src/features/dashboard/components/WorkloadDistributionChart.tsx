import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '../../../components/shared/EmptyState'
import type { DashboardEmployeeWorkloadRecord } from '../types/dashboard'

interface WorkloadDistributionChartProps {
  employees: DashboardEmployeeWorkloadRecord[]
}

export function WorkloadDistributionChart({ employees }: WorkloadDistributionChartProps) {
  if (employees.length === 0) {
    return <EmptyState description="Workload distribution appears after employee profiles and assigned tasks are available." title="No workload data yet" />
  }

  const data = employees.map((employee) => ({ name: employee.full_name, workload: Math.round(employee.workload_percentage) }))

  return (
    <figure aria-labelledby="workload-chart-title" className="rounded-xl border border-border-subtle bg-surface-card-alt p-4">
      <figcaption id="workload-chart-title" className="text-sm font-semibold text-text-primary">Workload distribution</figcaption>
      <p className="mt-1 text-sm text-text-secondary">Backend-calculated workload percentages for the employees currently carrying the most work.</p>
      <div aria-label={data.map((item) => `${item.name}: ${item.workload}% workload`).join('. ')} className="mt-4 h-56" role="img">
        <ResponsiveContainer height="100%" width="100%"><BarChart data={data} layout="vertical" margin={{ left: 8 }}><CartesianGrid horizontal={false} stroke="#e0e0d8" /><XAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} type="number" /><YAxis dataKey="name" type="category" width={100} /><Tooltip formatter={(value) => [`${value}%`, 'Workload']} /><Bar dataKey="workload" fill="#4157ad" radius={[4, 4, 4, 4]} /></BarChart></ResponsiveContainer>
      </div>
    </figure>
  )
}
