import { cn } from '@/lib/client/ui-utils'
import { CheckCircle, Clock, XCircle } from 'lucide-react'
import { ANALYSIS_STATUS, type AnalysisStatus } from '@/lib/utils/constants'

export type AnalysisReportWrapperProps = {
  title: string
  subtitle?: string // timestamp
  status?: AnalysisStatus
  actions?: { id: string; label: string; onClick?: () => void }[]
  children: React.ReactNode
}

function StatusIcon({ status }: { status?: AnalysisStatus }) {
  switch (status) {
    case ANALYSIS_STATUS.COMPLETE:
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case ANALYSIS_STATUS.PENDING:
      return <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
    case ANALYSIS_STATUS.ERROR:
      return <XCircle className="w-4 h-4 text-red-600" />
    default:
      return null
  }
}

export function AnalysisReportWrapper({
  title,
  subtitle,
  status = ANALYSIS_STATUS.COMPLETE,
  actions = [],
  children,
}: AnalysisReportWrapperProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon status={status} />
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    'text-slate-600 dark:text-slate-400',
                    'hover:text-slate-900 dark:hover:text-slate-100',
                    'hover:bg-slate-100 dark:hover:bg-slate-700',
                    'focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1'
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">{children}</div>
    </div>
  )
}
