import { generateObject } from 'ai'
import { z } from 'zod'
import { impactModel } from '@/lib/ai/ai-client'
import { ImpactAnalysisInput, ImpactAnalysisResult } from '@/types/impact-analysis'
import { getEnhancedContextualMemory } from '@/lib/db/enhanced-embeddings'
const SHOW_DEBUG_LOGS = process.env.SHOW_DEBUG_LOGS === 'true'

// Schema for pattern analysis
const patternAnalysisSchema = z.object({
  common_patterns: z.array(z.string()).describe('Common organizational change patterns identified'),
  potential_pitfalls: z.array(z.string()).describe('Potential pitfalls to avoid based on historical data'),
  success_factors: z.array(z.string()).describe('Key factors that lead to successful implementations'),
  contextual_insights: z.array(z.string()).describe('Insights specific to the role and change type')
})

// Schema for role-specific analysis
const roleSpecificSchema = z.object({
  role_challenges: z.array(z.string()).describe('Specific challenges this role faces during similar changes'),
  adaptation_strategies: z.array(z.string()).describe('Proven strategies for this role to adapt'),
  stakeholder_considerations: z.array(z.string()).describe('Key stakeholders this role needs to manage'),
  timeline_expectations: z.array(z.string()).describe('Realistic timeline expectations for this role')
})

// Enhanced result schema that includes agentic insights
const agenticAnalysisSchema = z.object({
  base_analysis: z.object({
    analysis_summary: z.string(),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']),
    risk_factors: z.array(z.string()),
    risk_scoring: z.object({
      scope: z.enum(['individual', 'team', 'organization', 'national', 'global']),
      severity: z.enum(['minor', 'moderate', 'major', 'catastrophic']),
      human_impact: z.enum(['none', 'limited', 'significant', 'mass_casualty']),
      time_sensitivity: z.enum(['long_term', 'short_term', 'immediate', 'critical'])
    }),
    decision_trace: z.array(z.string()),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string()
    }))
  }),
  pattern_insights: patternAnalysisSchema,
  role_insights: roleSpecificSchema,
  cross_reference: z.object({
    similar_scenarios: z.array(z.string()).describe('Similar scenarios from historical data'),
    comparative_risks: z.array(z.string()).describe('How risks compare to similar changes'),
    lessons_learned: z.array(z.string()).describe('Key lessons from comparable implementations')
  }),
  dynamic_insights: z.object({
    context_gaps: z.array(z.string()).describe('Identified gaps in context or analysis').optional(),
    emergent_patterns: z.array(z.string()).describe('New patterns discovered through multi-agent synthesis'),
    strategic_recommendations: z.array(z.string()).describe('High-level strategic recommendations based on complete analysis'),
    risk_refinements: z.array(z.string()).describe('Refinements to risk assessment based on comprehensive context'),
    implementation_priorities: z.array(z.string()).describe('Prioritized implementation steps based on all gathered insights')
  })
})

export type AgenticAnalysisResult = z.infer<typeof agenticAnalysisSchema>

// Export individual agents for streaming
export { runPatternAnalysisAgent, runRoleSpecificAgent, runCrossReferenceAgent, runDynamicReasoningAgent }

export async function performAgenticAnalysis(
  input: ImpactAnalysisInput,
  baseAnalysis: ImpactAnalysisResult
): Promise<AgenticAnalysisResult> {
  if (SHOW_DEBUG_LOGS) {
    console.log('[agentic-rag] Starting multi-agent analysis for:', input.role, '->', input.changeDescription)
  }

  try {
    // Start context retrieval early - can begin as soon as we have base analysis
    const enhancedContextPromise = getEnhancedContextualMemory(input, baseAnalysis.risk_level)

    if (SHOW_DEBUG_LOGS) {
      console.log('[agentic-rag] Context retrieval started in parallel with agent preparation')
    }

    // Wait for context to complete, then run agents
    const enhancedContext = await enhancedContextPromise

    if (SHOW_DEBUG_LOGS) {
      console.log(`[agentic-rag] Enhanced context retrieved: ${enhancedContext.summary.totalRetrievedChunks} chunks`)
      console.log(`[agentic-rag] Chunk type breakdown:`, enhancedContext.summary.chunkTypeBreakdown)
    }

    // Run three specialized agents in parallel with targeted context
    const [patternAnalysis, roleAnalysis] = await Promise.all([
      runPatternAnalysisAgent(input, baseAnalysis, enhancedContext.patternContext),
      runRoleSpecificAgent(input, baseAnalysis, enhancedContext.roleContext)
    ])

    // Run Cross-Reference and Dynamic agents with different parallelization strategies

    // Strategy 1: Cross-Reference needs Pattern + Role results (can start immediately)
    const crossReferencePromise = runCrossReferenceAgent(input, baseAnalysis, enhancedContext.crossRefContext, {
      patterns: patternAnalysis,
      roleInsights: roleAnalysis
    })

    // Strategy 2: Dynamic can start analysis without Cross-Ref results for most insights
    const { dynamicInsights, crossReference } = await runDynamicReasoningAgent(
      input,
      baseAnalysis,
      enhancedContext,
      {
        patterns: patternAnalysis,
        roleInsights: roleAnalysis
      },
      crossReferencePromise
    )

    if (SHOW_DEBUG_LOGS) {
      console.log('[agentic-rag] Multi-agent analysis with dynamic reasoning completed successfully')
    }

    return {
      base_analysis: {
        analysis_summary: baseAnalysis.analysis_summary,
        risk_level: baseAnalysis.risk_level,
        risk_factors: baseAnalysis.risk_factors,
        risk_scoring: { ...baseAnalysis.risk_scoring },
        decision_trace: baseAnalysis.decision_trace,
        sources: baseAnalysis.sources
      },
      pattern_insights: patternAnalysis,
      role_insights: roleAnalysis,
      cross_reference: crossReference,
      dynamic_insights: dynamicInsights
    }
  } catch (error) {
    console.error('[agentic-rag] Multi-agent analysis failed:', error)
    throw error
  }
}

async function runPatternAnalysisAgent(
  input: ImpactAnalysisInput,
  baseAnalysis: ImpactAnalysisResult,
  context: Awaited<ReturnType<typeof getEnhancedContextualMemory>>['patternContext']
): Promise<z.infer<typeof patternAnalysisSchema>> {
  if (SHOW_DEBUG_LOGS) {
    console.log('[agentic-rag] Running Pattern Analysis Agent with enhanced context')
  }

  const systemPrompt = `You are a Pattern Analysis Agent specializing in organizational change patterns.

CHANGE RISK PATTERNS:
${context.changeRisks.map(chunk =>
  `• Content: ${chunk.content}\n  Role: ${chunk.role}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No change risk patterns available'}

CONTEXTUAL ANALYSIS INSIGHTS:
${context.contextAnalysis.map(chunk =>
  `• Analysis: ${chunk.content}\n  Role: ${chunk.role}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No contextual analysis available'}

ROLE-CHANGE PATTERNS:
${context.roleChangeContext.map(chunk =>
  `• Pattern: ${chunk.content}\n  Role: ${chunk.role}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No role-change patterns available'}

Analyze the following change request and base analysis to identify patterns, pitfalls, and success factors based on historical organizational change data.

CHANGE REQUEST:
Role: ${input.role}
Change: ${input.changeDescription}

BASE ANALYSIS SUMMARY:
${baseAnalysis.analysis_summary}

Focus on identifying recurring patterns in similar organizational changes and provide actionable insights.`

  const result = await generateObject({
    model: impactModel,
    system: systemPrompt,
    prompt: `Provide pattern analysis for this organizational change, focusing on historical patterns and proven approaches.`,
    schema: patternAnalysisSchema
  })

  return result.object
}

async function runRoleSpecificAgent(
  input: ImpactAnalysisInput,
  baseAnalysis: ImpactAnalysisResult,
  context: Awaited<ReturnType<typeof getEnhancedContextualMemory>>['roleContext']
): Promise<z.infer<typeof roleSpecificSchema>> {
  if (SHOW_DEBUG_LOGS) {
    console.log('[agentic-rag] Running Role-Specific Agent with enhanced context')
  }

  const systemPrompt = `You are a Role-Specific Analysis Agent specializing in how different roles experience organizational change.

DIRECT ROLE-CHANGE MATCHES:
${context.roleChangeMatches.map(chunk =>
  `• Context: ${chunk.content}\n  Role: ${chunk.role}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No direct role-change matches available'}

ROLE CONTEXTUAL ANALYSIS:
${context.roleContextAnalysis.map(chunk =>
  `• Analysis: ${chunk.content}\n  Role: ${chunk.role}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No role contextual analysis available'}

CROSS-ROLE INSIGHTS:
${context.crossRoleInsights.map(chunk =>
  `• Insight: ${chunk.content}\n  Role: ${chunk.role}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No cross-role insights available'}

Analyze how this specific role typically handles similar organizational changes.

ROLE: ${input.role}
CHANGE: ${input.changeDescription}

BASE RISK ASSESSMENT:
Risk Level: ${baseAnalysis.risk_level}
Key Factors: ${baseAnalysis.risk_factors?.join(', ')}

Provide role-specific insights focusing on challenges, adaptation strategies, and stakeholder management for this type of role.`

  const result = await generateObject({
    model: impactModel,
    system: systemPrompt,
    prompt: `Analyze the specific challenges and strategies for this role during this type of organizational change.`,
    schema: roleSpecificSchema
  })

  return result.object
}

// Schema for cross-reference results
const crossRefSchema = z.object({
  similar_scenarios: z.array(z.string()).describe('Similar scenarios from historical data'),
  comparative_risks: z.array(z.string()).describe('How risks compare to similar changes'),
  lessons_learned: z.array(z.string()).describe('Key lessons from comparable implementations')
})

async function runCrossReferenceAgent(
  input: ImpactAnalysisInput,
  baseAnalysis: ImpactAnalysisResult,
  context: Awaited<ReturnType<typeof getEnhancedContextualMemory>>['crossRefContext'],
  agentResults: { patterns: any, roleInsights: any }
): Promise<z.infer<typeof crossRefSchema>> {
  if (SHOW_DEBUG_LOGS) {
    console.log('[agentic-rag] Running Cross-Reference Agent with enhanced context')
  }

  const systemPrompt = `You are a Cross-Reference Synthesis Agent that combines insights from pattern analysis and role-specific research.

PATTERN INSIGHTS:
Common Patterns: ${agentResults.patterns.common_patterns?.join(', ')}
Success Factors: ${agentResults.patterns.success_factors?.join(', ')}

ROLE INSIGHTS:
Role Challenges: ${agentResults.roleInsights.role_challenges?.join(', ')}
Adaptation Strategies: ${agentResults.roleInsights.adaptation_strategies?.join(', ')}

RISK-LEVEL MATCHED SCENARIOS:
${context.riskLevelMatches.map(chunk =>
  `• Scenario: ${chunk.content}\n  Role: ${chunk.role}\n  Risk Level: ${chunk.riskLevel || 'Unknown'}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No risk-level matches available'}

HISTORICAL SOURCE PATTERNS:
${context.historicalSources.map(chunk =>
  `• Source: ${chunk.content}\n  Role: ${chunk.role}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No historical sources available'}

COMPARATIVE ANALYSIS:
${context.comparativeAnalysis.map(chunk =>
  `• Analysis: ${chunk.content}\n  Role: ${chunk.role}\n  Similarity: ${chunk.similarity.toFixed(2)}`
).join('\n\n') || 'No comparative analysis available'}

Synthesize cross-references between this change and historical similar scenarios.

CURRENT ANALYSIS:
Role: ${input.role}
Change: ${input.changeDescription}
Risk Level: ${baseAnalysis.risk_level}`

  const result = await generateObject({
    model: impactModel,
    system: systemPrompt,
    prompt: `Provide cross-referenced insights comparing this change to historical similar scenarios.`,
    schema: crossRefSchema
  })

  return result.object
}

// Schema for dynamic reasoning results
const dynamicInsightsSchema = z.object({
  context_gaps: z.array(z.string()).describe('Identified gaps in context or analysis').optional(),
  emergent_patterns: z.array(z.string()).describe('New patterns discovered through multi-agent synthesis'),
  strategic_recommendations: z.array(z.string()).describe('High-level strategic recommendations based on complete analysis'),
  risk_refinements: z.array(z.string()).describe('Refinements to risk assessment based on comprehensive context'),
  implementation_priorities: z.array(z.string()).describe('Prioritized implementation steps based on all gathered insights')
})


async function runDynamicReasoningAgent(
  input: ImpactAnalysisInput,
  baseAnalysis: ImpactAnalysisResult,
  enhancedContext: Awaited<ReturnType<typeof getEnhancedContextualMemory>>,
  agentResults: {
    patterns: z.infer<typeof patternAnalysisSchema>,
    roleInsights: z.infer<typeof roleSpecificSchema>
  },
  crossReferencePromise: Promise<z.infer<typeof crossRefSchema>>
): Promise<{
  dynamicInsights: z.infer<typeof dynamicInsightsSchema>
  crossReference: z.infer<typeof crossRefSchema>
}> {
  if (SHOW_DEBUG_LOGS) {
    console.log('[agentic-rag] Running Optimized Dynamic Reasoning Agent with integrated cross-reference')
  }

  // Build comprehensive context summary for dynamic reasoning
  const contextSummary = {
    totalChunks: enhancedContext.summary.totalRetrievedChunks,
    chunkBreakdown: enhancedContext.summary.chunkTypeBreakdown,
    avgSimilarity: enhancedContext.summary.averageSimilarity,
    patternContextSize: enhancedContext.patternContext.changeRisks.length +
                       enhancedContext.patternContext.contextAnalysis.length +
                       enhancedContext.patternContext.roleChangeContext.length,
    roleContextSize: enhancedContext.roleContext.roleChangeMatches.length +
                    enhancedContext.roleContext.roleContextAnalysis.length +
                    enhancedContext.roleContext.crossRoleInsights.length,
    crossRefContextSize: enhancedContext.crossRefContext.riskLevelMatches.length +
                        enhancedContext.crossRefContext.historicalSources.length +
                        enhancedContext.crossRefContext.comparativeAnalysis.length
  }

  // Await cross-reference insights so dynamic reasoning can incorporate them fully
  const crossReference = await crossReferencePromise

  const systemPrompt = `You are an Optimized Dynamic Reasoning Agent - a meta-analyst who synthesizes insights from specialized agents and comprehensive contextual data.

=== CONTEXTUAL DATA SUMMARY ===
Total Retrieved Chunks: ${contextSummary.totalChunks}
Average Similarity Score: ${contextSummary.avgSimilarity.toFixed(3)}
Context Distribution:
- Pattern Context: ${contextSummary.patternContextSize} chunks
- Role Context: ${contextSummary.roleContextSize} chunks
- Cross-Reference Context: ${contextSummary.crossRefContextSize} chunks

=== BASE ANALYSIS ===
Risk Level: ${baseAnalysis.risk_level}
Risk Factors: ${baseAnalysis.risk_factors.join('; ')}
Risk Scoring: Scope=${baseAnalysis.risk_scoring.scope}, Severity=${baseAnalysis.risk_scoring.severity}, Human Impact=${baseAnalysis.risk_scoring.human_impact}, Time=${baseAnalysis.risk_scoring.time_sensitivity}

=== PATTERN AGENT FINDINGS ===
Common Patterns: ${agentResults.patterns.common_patterns.join('; ')}
Potential Pitfalls: ${agentResults.patterns.potential_pitfalls.join('; ')}
Success Factors: ${agentResults.patterns.success_factors.join('; ')}
Contextual Insights: ${agentResults.patterns.contextual_insights.join('; ')}

=== ROLE AGENT FINDINGS ===
Role Challenges: ${agentResults.roleInsights.role_challenges.join('; ')}
Adaptation Strategies: ${agentResults.roleInsights.adaptation_strategies.join('; ')}
Stakeholder Considerations: ${agentResults.roleInsights.stakeholder_considerations.join('; ')}
Timeline Expectations: ${agentResults.roleInsights.timeline_expectations.join('; ')}

=== CROSS-REFERENCE AGENT FINDINGS ===
Similar Scenarios: ${crossReference.similar_scenarios.join('; ')}
Comparative Risks: ${crossReference.comparative_risks.join('; ')}
Lessons Learned: ${crossReference.lessons_learned.join('; ')}

=== CURRENT CHANGE CONTEXT ===
Role: ${input.role}
Change: ${input.changeDescription}

REASONING TASK: Analyze all this information holistically to:
1. Identify context gaps or inconsistencies between agents
2. Discover emergent patterns that cross agent boundaries
3. Provide strategic recommendations synthesizing ALL agent outputs
4. Refine risk assessment based on comprehensive comparisons
5. Prioritize implementation steps that reflect historical lessons

Use disciplined meta-reasoning that explicitly references the evidence provided above.`

  const dynamicAnalysis = await generateObject({
    model: impactModel,
    system: systemPrompt,
    prompt: `Provide dynamic insights that synthesize Pattern, Role, and Cross-Reference findings with the full contextual data. Reference the evidence explicitly when identifying gaps, emergent patterns, strategic recommendations, risk refinements, and implementation priorities.`,
    schema: dynamicInsightsSchema
  })

  if (SHOW_DEBUG_LOGS) {
    console.log('[agentic-rag] Optimized Dynamic Reasoning Agent completed with cross-reference insights')
  }

  return {
    dynamicInsights: dynamicAnalysis.object,
    crossReference
  }
}
