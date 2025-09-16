"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Target, Users, AlertTriangle } from "lucide-react"

interface ImpactAnalysis {
  role: string
  impact: string[]
}

export default function ImpactAnalysisPage() {
  const [role, setRole] = useState("")
  const [changeDescription, setChangeDescription] = useState("")
  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const analyzeImpact = async () => {
    if (!role.trim() || !changeDescription.trim()) {
      setError("Please fill in both fields")
      return
    }

    setLoading(true)
    setError("")
    setAnalysis(null)

    try {
      const response = await fetch("/api/analyze-impact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: role.trim(),
          changeDescription: changeDescription.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze impact")
      }

      const result = await response.json()
      setAnalysis(result)
    } catch (err) {
      setError("Failed to analyze impact. Please try again.")
      console.error("Analysis error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-6">
              <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4 text-balance">
              Impact Analysis Agent
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 text-balance">
              Predict how organizational changes will affect different roles and teams
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Change Analysis
                </CardTitle>
                <CardDescription>Enter the role/team and describe the proposed change</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Role or Team
                  </Label>
                  <Input
                    id="role"
                    placeholder="e.g., Sales Manager, Marketing Team, Customer Support"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-white dark:bg-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="change" className="text-sm font-medium">
                    Proposed Change
                  </Label>
                  <Textarea
                    id="change"
                    placeholder="Describe the change in 1-2 sentences..."
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    rows={4}
                    className="bg-white dark:bg-slate-700 resize-none"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button
                  onClick={analyzeImpact}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Impact...
                    </>
                  ) : (
                    "Analyze Impact"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Impact Analysis
                </CardTitle>
                <CardDescription>Predicted impacts for the specified role</CardDescription>
              </CardHeader>
              <CardContent>
                {!analysis && !loading && (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a role and change description to see the impact analysis</p>
                  </div>
                )}

                {loading && (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                    <p className="text-slate-600 dark:text-slate-400">Analyzing potential impacts...</p>
                  </div>
                )}

                {analysis && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Role: {analysis.role}</h3>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">Predicted Impacts:</h4>
                      <ul className="space-y-2">
                        {analysis.impact.map((item, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                          >
                            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
