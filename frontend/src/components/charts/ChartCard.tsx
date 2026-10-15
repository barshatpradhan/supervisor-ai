import type { ReactNode } from 'react'
import { useId, useState } from 'react'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { StateBlock } from '../ui/StateBlock'

interface ChartTable {
  columns: { key: string; label: string; unit?: string }[]
  rows: Record<string, string | number>[]
}

interface ChartCardProps {
  action?: ReactNode
  children: ReactNode
  className?: string
  emptyText?: string
  errorText?: string
  helper?: string
  onRetry?: () => void
  state?: 'ready' | 'loading' | 'empty' | 'error'
  summary?: string
  table?: ChartTable
  title: string
  variant?: 'default' | 'ai'
}

/**
 * A card that holds one chart: title, one helper line, an optional summary value, a table
 * toggle, and loading, empty and error states. The table is the chart's text alternative.
 */
export function ChartCard({
  action,
  children,
  className = '',
  emptyText = 'There is no data to show yet.',
  errorText = 'This chart could not be loaded.',
  helper,
  onRetry,
  state = 'ready',
  summary,
  table,
  title,
  variant = 'default',
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)
  const titleId = useId()
  const tableId = useId()

  return (
    <Card aria-labelledby={titleId} className={`flex flex-col gap-4 ${className}`} variant={variant}>
      <CardHeader
        action={
          <>
            {summary ? <span className="stat-md text-text-primary">{summary}</span> : null}
            {table && state === 'ready' ? (
              <Button aria-controls={tableId} aria-expanded={showTable} className="min-h-8 px-2.5" onClick={() => setShowTable((open) => !open)} variant="ghost">
                {showTable ? 'Hide table' : 'Show table'}
              </Button>
            ) : null}
            {action}
          </>
        }
        helper={helper}
        id={titleId}
        title={title}
      />
      {state === 'loading' ? <StateBlock compact kind="loading" title={`Loading ${title.toLowerCase()}`} /> : null}
      {state === 'empty' ? <StateBlock compact>{emptyText}</StateBlock> : null}
      {state === 'error' ? (
        <StateBlock action={onRetry ? <Button onClick={onRetry} variant="secondary">Retry</Button> : undefined} compact kind="error">
          {errorText}
        </StateBlock>
      ) : null}
      {state === 'ready' ? (
        <>
          <div aria-hidden={table ? true : undefined}>{children}</div>
          {table ? (
            <div className={showTable ? 'overflow-x-auto rounded-control border border-border-default' : 'sr-only'} id={tableId}>
              <table className="body w-full border-collapse text-left">
                <caption className="sr-only">{title}</caption>
                <thead className="bg-surface-muted">
                  <tr>
                    {table.columns.map((column) => (
                      <th className="label px-3 py-2 text-text-secondary" key={column.key} scope="col">{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr className="border-t border-chart-grid" key={index}>
                      {table.columns.map((column) => (
                        <td className="px-3 py-2 text-text-primary" key={column.key}>
                          {row[column.key]}{column.unit ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  )
}
