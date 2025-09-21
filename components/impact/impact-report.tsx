"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Target } from "lucide-react"
import { ImpactResult } from "@/types/impact"
import { ImpactArtifact } from "@/components/impact/impact-artifact"
import { ArtifactCard } from "@/components/impact/artifact-card"

interface ImpactResultWithArtifactProps {
  result: ImpactResult | null
}


function ImpactReport({ result }: { result: ImpactResult }) {
  return (
    <div className="space-y-6">
      {/* AI SDK Format Preview */}
      <div>
        <ImpactArtifactFilter result={result} />
      </div>
    </div>
  )
}

function ImpactArtifactFilter({ result }: { result: ImpactResult }) {
  // Return the result directly since it's already in the correct format
  const createPreviewResult = (): ImpactResult | null => {
    if (!result.summary_markdown) return null
    return result
  }

  const previewResult = createPreviewResult()

  if (!previewResult) {
    return (
      <ArtifactCard
        title="Enhanced Impact Analysis"
        subtitle="No summary available"
        status="complete"
      >
        <p className="text-slate-600 dark:text-slate-400 text-center py-8">
          No summary content available to preview the AI SDK format.
        </p>
      </ArtifactCard>
    )
  }

  return (
    <ImpactArtifact
      data={previewResult}
      onRegenerate={undefined}
      onShare={() => console.log("Share clicked")}
      showActions={false}
      role={result.meta?.role}
      riskFactors={result.risk_reasons || []}
      proposedChange={result.meta?.changeDescription}
    />
  )
}

export function ImpactResultWithArtifact({ result }: ImpactResultWithArtifactProps) {
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

        {result && (
          <ImpactReport result={result} />
        )}
      </CardContent>
    </Card>
  )
}