# Planner/Router Integration Guide

This document explains how to integrate the principled planner and subagent router system into the existing ChangeSim API flow.

## Architecture Overview

The planner/router system extends ChangeSim from a simple risk calculator to a multi-agent organizational dynamics engine. The integration happens after the core impact analysis but before returning results to the client.

```
API Flow:
1. Input validation ✓ (existing)
2. AI-powered impact analysis ✓ (existing)
3. Risk mapping & guardrails ✓ (existing)
4. → Organizational principles validation (NEW)
5. → Multi-perspective testing (NEW)
6. → Human-centered analysis (NEW)
7. → Planner determines next steps (NEW)
8. → Router executes relevant subagents (NEW)
9. Enhanced result with actionable plans (NEW)
```

## Integration Point

The integration happens in `app/api/analyze-impact/route.ts` after line 131, where the basic `ImpactResult` is constructed but before returning the response.

```typescript
// Current code ends here:
const result: ImpactResult = parsedResult

// NEW: Add principled analysis and planning
const enhancedResult = await addPrincipledAnalysis(result, { role, changeDescription })

console.log('[impact] Impact analysis completed successfully')
return NextResponse.json(enhancedResult) // Return enhanced result
```

## Implementation Steps

### 1. Import Required Modules

Add these imports to the top of `route.ts`:

```typescript
import { validatePrinciples } from '@/lib/organizational-principles'
import { testMultiplePerspectives } from '@/lib/multi-perspective-testing'
import { validateHumanCenteredApproach } from '@/lib/human-centered-framework'
import { planNextSteps } from '@/lib/plan/planner'
import { executePlan, summarizeActions, extractKeyRecommendations } from '@/lib/plan/router'
import { persistRun } from '@/lib/runs-store'
```

### 2. Create Integration Function

```typescript
async function addPrincipledAnalysis(
  baseResult: ImpactResult,
  context: { role: string; changeDescription: string }
): Promise<EnhancedImpactResult> {
  const { role, changeDescription } = context
  const { risk_scoring } = baseResult

  // Step 1: Validate organizational principles
  const principleValidation = validatePrinciples([baseResult], {
    organizationalSize: 'medium',
    currentChangeLoad: 1.2,
    hasNamedSuccessor: risk_scoring.scope !== 'individual',
    cultureDistance: risk_scoring.severity === 'major' ? 0.8 : 0.3
  })

  // Step 2: Test multiple stakeholder perspectives
  const perspectiveResults = testMultiplePerspectives(baseResult, context)

  // Step 3: Human-centered validation
  const humanValidation = validateHumanCenteredApproach(baseResult, context)

  // Step 4: Build diagnostic input for planner
  const diagnostics = {
    principles: { violations: principleValidation.violations },
    human_centered: {
      score: humanValidation.overallScore,
      improvements: humanValidation.improvements
    },
    perspectives: {
      overallScore: perspectiveResults.overallScore,
      gaps: perspectiveResults.gaps
    },
    orgSignals: {
      changeLoadPct: calculateChangeLoadPct(risk_scoring),
      hasNamedSuccessor: risk_scoring.scope === 'individual',
      cultureDistance: risk_scoring.severity === 'major' ? 0.8 : 0.3
    }
  }

  // Step 5: Plan next steps
  const plan = planNextSteps(diagnostics)

  // Step 6: Execute subagents if actions needed
  let actionResults = null
  if (plan.signals.some(s => s.kind !== 'none')) {
    const subagentInput = {
      role,
      changeDescription,
      risk_scoring,
      diagnostics
    }
    actionResults = await executePlan(plan, subagentInput)
  }

  // Step 7: Persist for learning (when Supabase available)
  await persistRun({
    role,
    change_desc: changeDescription,
    principles_json: principleValidation,
    perspectives_json: perspectiveResults,
    human_json: humanValidation,
    plan_json: plan,
    actions_json: actionResults
  })

  // Step 8: Enhance the result
  return {
    ...baseResult,
    principles: principleValidation,
    perspectives: perspectiveResults,
    humanCentered: humanValidation,
    plan,
    actions: actionResults ? {
      summary: summarizeActions(actionResults),
      keyRecommendations: extractKeyRecommendations(actionResults, 5),
      executed: actionResults.actions
    } : null
  }
}

function calculateChangeLoadPct(riskScoring: any): number {
  // Convert risk scoring to change load percentage
  const scopeMultiplier = { individual: 50, team: 80, organization: 120, national: 150, global: 200 }
  const severityMultiplier = { minor: 0.8, moderate: 1.0, major: 1.4, catastrophic: 2.0 }

  const scope = scopeMultiplier[riskScoring.scope as keyof typeof scopeMultiplier] || 100
  const severity = severityMultiplier[riskScoring.severity as keyof typeof severityMultiplier] || 1.0

  return Math.round(scope * severity)
}
```

### 3. Update Response Type

Create an enhanced result interface:

```typescript
interface EnhancedImpactResult extends ImpactResult {
  principles?: any
  perspectives?: any
  humanCentered?: any
  plan?: any
  actions?: {
    summary: any
    keyRecommendations: string[]
    executed: any[]
  } | null
}
```

## Usage Examples

### Basic Integration (Minimal Changes)

For immediate integration with minimal API changes, only expose the action recommendations:

```typescript
// Add only the key recommendations to existing result
if (actionResults) {
  result.action_recommendations = extractKeyRecommendations(actionResults, 3)
}
```

### Full Integration (Complete Enhancement)

For full principled analysis, return the complete enhanced result. Frontend components can then access:

- `result.principles.violations` - Organizational law violations
- `result.perspectives.gaps` - Stakeholder blind spots
- `result.humanCentered.improvements` - Human dignity concerns
- `result.plan.signals` - Recommended intervention types
- `result.actions.keyRecommendations` - Specific actionable steps

## Error Handling

Wrap the principled analysis in try-catch to ensure basic functionality remains if the new system fails:

```typescript
try {
  const enhancedResult = await addPrincipledAnalysis(result, { role, changeDescription })
  return NextResponse.json(enhancedResult)
} catch (error) {
  console.error('[impact] Principled analysis failed, returning basic result:', error)
  return NextResponse.json(result) // Fallback to basic analysis
}
```

## Configuration Options

Add environment variables to control the feature:

```typescript
const ENABLE_PRINCIPLED_ANALYSIS = process.env.ENABLE_PRINCIPLED_ANALYSIS !== 'false'
const ENABLE_SUBAGENT_EXECUTION = process.env.ENABLE_SUBAGENT_EXECUTION !== 'false'

if (ENABLE_PRINCIPLED_ANALYSIS) {
  // Run enhanced analysis
}
```

## Testing Integration

Update the API tests to verify the new functionality:

```typescript
// Test that enhanced analysis doesn't break existing API
test('API returns enhanced results with principles', async () => {
  const response = await POST(mockRequest)
  const result = await response.json()

  expect(result.risk_level).toBeDefined() // Existing functionality
  expect(result.principles).toBeDefined() // New functionality
  expect(result.actions?.keyRecommendations).toBeInstanceOf(Array)
})
```

## Migration Strategy

1. **Phase 1**: Add principled analysis but don't change API response format
2. **Phase 2**: Add action recommendations as optional field
3. **Phase 3**: Full enhanced response with feature flag
4. **Phase 4**: Make enhanced analysis the default

This approach ensures backward compatibility while gradually rolling out the principled framework capabilities.