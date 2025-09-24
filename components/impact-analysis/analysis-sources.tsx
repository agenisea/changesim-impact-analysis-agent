import { ExternalLink } from 'lucide-react'

interface Source {
  title: string
  url: string
}

interface AnalysisSourcesProps {
  items: Source[]
}

export function AnalysisSources({ items }: AnalysisSourcesProps) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">References:</h3>
      <div className="space-y-2">
        {items.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 truncate">{source.title}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
