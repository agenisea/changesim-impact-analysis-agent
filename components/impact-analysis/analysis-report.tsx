'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Target } from 'lucide-react'
import { ImpactAnalysisResult } from '@/types/impact-analysis'
import { AnalysisReportArtifact } from '@/components/impact-analysis/analysis-report-artifact'
import { AnalysisReportWrapper } from '@/components/impact-analysis/analysis-report-wrapper'
import { ANALYSIS_STATUS } from '@/lib/utils/constants'

interface AnalysisResultWithArtifactProps {
  result: ImpactAnalysisResult | null
}

function AnalysisReport({ result }: { result: ImpactAnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* AI SDK Format Preview */}
      <div>
        <AnalysisReportPreview result={result} />
      </div>
    </div>
  )
}

function AnalysisReportPreview({ result }: { result: ImpactAnalysisResult }) {
  // Return the result directly since it's already in the correct format
  const createPreviewResult = (): ImpactAnalysisResult | null => {
    if (!result.analysis_summary) return null
    return result
  }

  const previewResult = createPreviewResult()

  if (!previewResult) {
    return (
      <AnalysisReportWrapper
        title="Enhanced Impact Analysis"
        subtitle="No summary available"
        status={ANALYSIS_STATUS.COMPLETE}
      >
        <p className="text-slate-600 dark:text-slate-400 text-center py-8">
          No summary content available to preview the AI SDK format.
        </p>
      </AnalysisReportWrapper>
    )
  }

  return (
    <AnalysisReportArtifact
      data={previewResult}
      onRegenerate={undefined}
      onShare={() => {}}
      showActions={false}
      role={result.meta?.role}
      riskFactors={result.risk_factors || []}
      proposedChange={result.meta?.changeDescription}
    />
  )
}

export function AnalysisResultWithArtifact({ result }: AnalysisResultWithArtifactProps) {
  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Impact Analysis
        </CardTitle>
        <CardDescription>Predicted impacts for the specified role</CardDescription>
      </CardHeader>
      <CardContent>
        {!result && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter a role and change description to see the impact analysis</p>
          </div>
        )}

        {result && <AnalysisReport result={result} />}
      </CardContent>
    </Card>
  )
}
