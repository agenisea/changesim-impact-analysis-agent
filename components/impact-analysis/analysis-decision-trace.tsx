interface AnalysisDecisionTraceProps {
  items: string[]
}

export function AnalysisDecisionTrace({ items }: AnalysisDecisionTraceProps) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Analysis Process:</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50"
          >
            <div className="flex-shrink-0 mt-2">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full" />
            </div>
            <span className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
