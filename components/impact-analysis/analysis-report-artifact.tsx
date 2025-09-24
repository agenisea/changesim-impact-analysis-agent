import { AnalysisReportWrapper } from './analysis-report-wrapper'
import { AnalysisRiskBadge } from './analysis-risk-badge'
import { AnalysisDecisionTrace } from './analysis-decision-trace'
import { AnalysisSources } from './analysis-sources'
import { ImpactAnalysisResult } from '@/types/impact-analysis'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ANALYSIS_STATUS } from '@/lib/config/constants'

export function AnalysisReportArtifact({
  data,
  onRegenerate,
  onShare,
  showActions = true,
  role,
  riskFactors,
  proposedChange,
}: {
  data: ImpactAnalysisResult
  onRegenerate?: () => void
  onShare?: () => void
  showActions?: boolean
  role?: string
  riskFactors?: string[]
  proposedChange?: string
}) {
  const handleCopy = async () => {
    let content = `# Impact Analysis Report\n\n`

    // Add timestamp
    const timestamp = new Date(data.meta?.timestamp ?? Date.now()).toLocaleString()
    content += `**Generated:** ${timestamp}\n\n`

    // Add Role and Risk Level
    if (role) {
      content += `## Role Analysis\n\n`
      content += `**Role:** ${role}\n\n`

      if (proposedChange) {
        content += `**Proposed Change:**\n${proposedChange}\n\n`
      }

      content += `**Risk Level:** ${data.risk_level}\n\n`
    }

    // Add Risk Factors
    if (riskFactors && riskFactors.length > 0) {
      content += `## Risk Assessment\n\n`
      content += `The following risk factors have been identified:\n\n`
      riskFactors.forEach((factor, index) => {
        content += `${index + 1}. ${factor}\n`
      })
      content += `\n`
    }

    // Add Summary
    content += `## Executive Summary\n\n${data.analysis_summary}\n\n`

    // Add Decision Trace
    if (data.decision_trace?.length) {
      content += `## Analysis Process\n\n`
      content += `The following steps were taken during the impact analysis:\n\n`
      data.decision_trace.forEach((item: string, index: number) => {
        content += `${index + 1}. ${item}\n`
      })
      content += `\n`
    }

    // Add Sources
    if (data.sources?.length) {
      content += `## References\n\n`
      content += `This analysis was informed by the following sources:\n\n`
      data.sources.forEach((source: { title: string; url: string }, index: number) => {
        content += `${index + 1}. [${source.title}](${source.url})\n`
      })
      content += `\n`
    }

    // Add footer
    content += `---\n\n`
    content += `*This report was generated using the Impact Analysis Agent*`

    try {
      await navigator.clipboard.writeText(content)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <AnalysisReportWrapper
      title="Report"
      subtitle={new Date(data.meta?.timestamp ?? Date.now()).toLocaleString()}
      status={data.meta?.status ?? ANALYSIS_STATUS.COMPLETE}
      actions={
        showActions
          ? [
              { id: 'copy', label: 'Copy', onClick: handleCopy },
              { id: 'regen', label: 'Regenerate', onClick: onRegenerate },
              { id: 'share', label: 'Share', onClick: onShare },
            ]
          : [{ id: 'copy', label: 'Copy', onClick: handleCopy }]
      }
    >
      {/* Role Section */}
      {role && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <div className="mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Role: <span className="text-slate-700 dark:text-slate-300">{role}</span>
            </h3>
          </div>
          {proposedChange && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                  Proposed Change:
                </h4>
                <AnalysisRiskBadge level={data.risk_level} reason={data.risk_rationale} />
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {proposedChange}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Risk Factors Section */}
      {riskFactors && riskFactors.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Risk Assessment:
          </h3>
          <div className="space-y-2">
            {riskFactors.map((reason: string, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/50"
              >
                <div className="flex-shrink-0 mt-2">
                  <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  {reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Original Risk Badge (only show if no role provided) */}
      {!role && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <AnalysisRiskBadge level={data.risk_level} reason={data.risk_rationale} />
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Executive Summary:
        </h3>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 mt-6">
                  {children}
                </h3>
              ),
            }}
          >
            {data.analysis_summary}
          </ReactMarkdown>
        </div>
      </div>

      {data.decision_trace?.length ? (
        <div className="mt-6">
          <AnalysisDecisionTrace items={data.decision_trace} />
        </div>
      ) : null}

      {data.sources?.length ? (
        <div className="mt-6">
          <AnalysisSources items={data.sources} />
        </div>
      ) : null}
    </AnalysisReportWrapper>
  )
}
