import type { ReactNode } from 'react'

export interface DataTableColumn<TData> {
  cell: (row: TData) => ReactNode
  header: string
  id: string
}

interface DataTableProps<TData> {
  columns: readonly DataTableColumn<TData>[]
  emptyMessage: string
  getRowId: (row: TData) => string
  rows: readonly TData[]
}

export function DataTable<TData>({ columns, emptyMessage, getRowId, rows }: DataTableProps<TData>) {
  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-border-subtle p-6 text-sm text-text-secondary">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-muted text-text-secondary">
          <tr>{columns.map((column) => <th className="px-4 py-3 font-semibold" key={column.id} scope="col">{column.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-surface-card">
          {rows.map((row) => <tr key={getRowId(row)}>{columns.map((column) => <td className="px-4 py-3 text-text-primary" key={column.id}>{column.cell(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}
