'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Users, AlertTriangle } from 'lucide-react'
import { ImpactAnalysisInput } from '@/types/impact-analysis'

interface AnalysisFormProps {
  initial?: ImpactAnalysisInput
  onSubmit: (input: ImpactAnalysisInput) => Promise<void> | void
  busy?: boolean
}

export function AnalysisForm({ initial, onSubmit, busy = false }: AnalysisFormProps) {
  const [role, setRole] = useState(initial?.role || '')
  const [changeDescription, setChangeDescription] = useState(initial?.changeDescription || '')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!role.trim() || !changeDescription.trim()) {
      setError('Please fill in both fields')
      return
    }

    setError('')
    await onSubmit({
      role: role.trim(),
      changeDescription: changeDescription.trim(),
    })
  }

  return (
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
            onChange={e => setRole(e.target.value)}
            className="bg-white dark:bg-slate-700"
            disabled={busy}
            aria-required="true"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'form-error' : undefined}
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
            onChange={e => setChangeDescription(e.target.value)}
            rows={4}
            className="bg-white dark:bg-slate-700 resize-none"
            disabled={busy}
            aria-required="true"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'form-error' : undefined}
          />
        </div>

        {error && (
          <div
            id="form-error"
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm"
          >
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            {error}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={busy}
          aria-busy={busy}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Impact...
            </>
          ) : (
            'Analyze Impact'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
