import { type ImpactChunkMatch } from '@/lib/db/retrieval'
import { RAG_CONFIG } from '@/lib/utils/constants'

const SHOW_DEBUG_LOGS = process.env.SHOW_DEBUG_LOGS === 'true'


// Dynamic prompt builder that combines role context with RAG insights
export interface DynamicPromptConfig {
  role: string
  changeDescription: string
  context?: string // Optional for future use
  baseSystemPrompt: string
  matches?: ImpactChunkMatch[]
}

export interface PromptEnhancement {
  roleContext: string
  ragInsights: string
  focusAreas: string[]
  similarScenarios: string
  enhancedSystemPrompt: string
}

function buildRoleContext(role: string, changeDescription: string): string {
  return `
**Role-Specific Analysis Context:**
As a ${role}, you need to evaluate this change through your unique lens of responsibility and expertise.

**Change to Analyze:** ${changeDescription}

**Your Role-Specific Approach:**
- Consider how this change directly impacts your day-to-day responsibilities as a ${role}
- Identify the specific risks and opportunities that matter most to someone in your position
- Think about the questions a ${role} would immediately ask about this change
- Focus on the outcomes and consequences that would be on a ${role}'s radar
- Consider what success and failure would look like from a ${role} perspective

**Ripple Effects Consideration:**
- How might your decisions as a ${role} in response to this change affect other teams or roles?
- What secondary impacts could emerge from this change that you should anticipate?
- Who else might be affected by the actions you take or recommend as a ${role}?

**Perspective Note:** Remember that your view as a ${role} offers unique insights that others in different positions might not see.

**Analysis Instructions:**
Provide insights that would be most valuable and actionable for someone in the ${role} position, considering both immediate and longer-term implications of this specific change.`
}


function buildRAGContext(ragContent: string, role: string, changeDescription: string): string {
  if (!ragContent.trim()) {
    return ''
  }

  return `
**Relevant Historical Context:**
Based on similar changes involving ${role} roles, here are relevant insights from past analyses:

${ragContent}

**Integration Instructions:**
- Compare the current change with these historical scenarios
- Identify patterns that suggest similar risks or opportunities
- Note where historical outcomes validate or contradict your initial assessment
- Look for ripple effects that emerged in past changes that you should anticipate
- Highlight any lessons learned that should influence your recommendations
- Consider how your perspective as a ${role} might reveal different insights than past analyses`
}

export async function buildDynamicPrompt({
  role,
  changeDescription,
  context,
  baseSystemPrompt,
  matches,
}: DynamicPromptConfig): Promise<PromptEnhancement> {
  const startTime = Date.now()
  if (SHOW_DEBUG_LOGS) {
    console.log('[dynamic-prompting] Starting relativity-based dynamic prompting', {
      role,
      changeDescription: changeDescription.substring(0, 100) + (changeDescription.length > 100 ? '...' : ''),
      hasContext: !!context,
      contextLength: context?.length || 0,
      approach: 'organizational perspective relativity - what you see depends on where you stand',
      providedMatches: matches?.length ?? 0,
    })
  }

  try {
    // 1. Build role-specific context
    const roleContext = buildRoleContext(role, changeDescription)
    const focusAreas = ['role-specific impact analysis']

    if (SHOW_DEBUG_LOGS) {
      console.log('[dynamic-prompting] Role-change analysis:', {
        role,
        changeType: changeDescription.substring(0, 50) + (changeDescription.length > 50 ? '...' : ''),
        focusAreas,
        perspectiveAware: true,
        providedMatches: matches?.length ?? 0,
      })
    }

    const safeMatches = (matches ?? []).filter(match => match.similarity >= RAG_CONFIG.FALLBACK_SIMILARITY)

    if (SHOW_DEBUG_LOGS) {
      console.log('[dynamic-prompting] Match analysis:', {
        providedMatches: matches?.length ?? 0,
        usableMatches: safeMatches.length,
        similarities: safeMatches.map(m => m.similarity.toFixed(3)),
      })
    }

    const ragInsights = safeMatches
      .map((match, index) => {
        const similarity = (match.similarity * 100).toFixed(1)
        return `**Similar Scenario ${index + 1}** (${similarity}% similarity):\n${match.content.substring(0, 300)}...`
      })
      .join('\n\n')

    const similarScenarios = ragInsights || 'No directly similar scenarios found in historical data.'

    // Build enhanced system prompt
    const enhancedSystemPrompt = `${baseSystemPrompt}

${roleContext}

${buildRAGContext(ragInsights, role, changeDescription)}

**Dynamic Analysis Instructions:**
- Analyze this specific change through the lens of a ${role}'s unique responsibilities and concerns
- Consider how a ${role} would naturally approach and prioritize this type of change
- Think through both direct impacts and potential ripple effects that could emerge
- Use historical context to inform your role-specific perspective, but focus on this particular scenario
- Provide insights that would be immediately valuable and actionable for a ${role} facing this exact situation
- Frame your recommendations in terms a ${role} would use and could readily implement
- Remember that your role perspective offers unique insights others might miss`

    const totalDuration = Date.now() - startTime
    if (SHOW_DEBUG_LOGS) {
      console.log('[dynamic-prompting] Role-change dynamic prompting completed successfully', {
        durationMs: totalDuration,
        ragMatches: safeMatches.length,
        enhancedPromptLength: enhancedSystemPrompt.length,
        hasHistoricalInsights: safeMatches.length > 0,
        approach: 'role-specific analysis of specific change scenario',
      })
    }

    if (SHOW_DEBUG_LOGS) {
      console.log('[dynamic-prompting] Role-change prompt preview:', {
        roleContextLength: roleContext.length,
        ragInsightsLength: ragInsights.length,
        focusAreas,
        roleChangeApproach: true,
        contextualizedForRole: role,
        targetedForChange: changeDescription.length > 0,
        historicalContextIncluded: safeMatches.length > 0,
      })
    }

    return {
      roleContext,
      ragInsights: similarScenarios,
      focusAreas,
      similarScenarios,
      enhancedSystemPrompt
    }

  } catch (error) {
    const errorDuration = Date.now() - startTime
    console.error('[dynamic-prompting] Failed to build enhanced prompt after', errorDuration + 'ms:', {
      error: (error as Error).message,
      role,
      fallbackStrategy: 'basic role context only'
    })

    // Fallback to basic role context if RAG fails
    const roleContext = buildRoleContext(role, changeDescription)
    const focusAreas = ['role-specific impact analysis']

    if (SHOW_DEBUG_LOGS) {
      console.log('[dynamic-prompting] Using fallback role-change analysis', {
        fallbackFocusAreas: focusAreas,
        roleChangeApproach: 'contextual analysis without historical data'
      })
    }

    return {
      roleContext,
      ragInsights: 'Historical context unavailable',
      focusAreas,
      similarScenarios: 'No historical data available',
      enhancedSystemPrompt: `${baseSystemPrompt}\n\n${roleContext}`,
    }
  }
}
