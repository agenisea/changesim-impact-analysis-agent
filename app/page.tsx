"use client"

import { useState } from "react"
import { Target, Loader2, AlertTriangle } from "lucide-react"
import { ImpactForm } from "@/components/impact/impact-form"
import { ImpactResultWithArtifact } from "@/components/impact/impact-report"
import { submitImpactAnalysis } from "@/lib/analyze-impact"
import { ImpactInput, ImpactResult as ImpactResultType } from "@/types/impact"

export default function ImpactAnalysisPage() {
  const [result, setResult] = useState<ImpactResultType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (input: ImpactInput) => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const analysis = await submitImpactAnalysis(input)
      setResult(analysis)
    } catch (err) {
      setError("Failed to analyze impact. Please try again.")
      console.error("Analysis error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 lg:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4 lg:mb-6">
              <Target className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 lg:mb-4 text-balance">
              ChangeSim Impact Analysis
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400 text-balance max-w-3xl mx-auto">
              Predict how organizational changes will affect different roles and teams
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
            <div className="w-full xl:w-96 xl:flex-shrink-0">
              <ImpactForm onSubmit={handleSubmit} busy={loading} />
            </div>
            <div className="w-full xl:flex-1 min-w-0">
              {loading ? (
                <div className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg">
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                    <p className="text-slate-600 dark:text-slate-400">Analyzing potential impacts...</p>
                  </div>
                </div>
              ) : (
                <ImpactResultWithArtifact result={result} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
