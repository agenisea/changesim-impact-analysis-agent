import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Target } from "lucide-react"
import { ImpactResult as ImpactResultType } from "@/types/impact"

interface ImpactResultProps {
  result: ImpactResultType | null
}

export function ImpactResult({ result }: ImpactResultProps) {
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
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Role: {result.role}</h3>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-slate-900 dark:text-slate-100">Predicted Impacts:</h4>
              <ul className="space-y-2">
                {result.impact.map((item, index) => (
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
  )
}