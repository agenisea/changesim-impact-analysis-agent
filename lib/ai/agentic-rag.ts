import { generateObject, type GenerateObjectResult } from 'ai'
import { type ZodSchema } from 'zod'
import { IMPACT_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai/impact-analysis'
import { impactModel } from '@/lib/ai/ai-client'
import { embedImpactQuery } from '@/lib/ai/embeddings'
import { matchImpactChunks, type ImpactChunkMatch } from '@/lib/db/retrieval'
import { buildDynamicPrompt } from '@/lib/ai/dynamic-prompting'
import { RAG_CONFIG, TEMPERATURE, MAX_OUTPUT_TOKENS, AGENT_TYPE } from '@/lib/utils/constants'

const SHOW_DEBUG_LOGS = process.env.SHOW_DEBUG_LOGS === 'true'

export type AgenticRagDiagnostics = {
  matchCount: number
  averageSimilarity: number
  retrievalIds: string[]
  roleContext: string
  focusAreas: string[]
  dynamicPromptUsed: boolean
}

export interface AgenticRagParams<T> {
  role: string
  changeDescription: string
  context?: unknown // Optional for future use
  schema: ZodSchema<T>
}

export type AgenticRagResult<T> =
  | ({
      strategy: typeof AGENT_TYPE.AGENTIC_RAG
      diagnostics: AgenticRagDiagnostics
    } & GenerateObjectResult<T>)
  | { strategy: typeof AGENT_TYPE.AGENTIC_RAG; error: Error }
  | { strategy: typeof AGENT_TYPE.AGENTIC_RAG; skipped: true; reason: 'insufficient-context' }

function buildQueryText(role: string, changeDescription: string, context?: unknown): string {
  const contextText = typeof context === 'string' ? context : context ? JSON.stringify(context) : ''
  return contextText
    ? `Role: ${role}\nChange: ${changeDescription}\nContext: ${contextText}`
    : `Role: ${role}\nChange: ${changeDescription}`
}

export async function invokeAgenticRag<T>({
  role,
  changeDescription,
  context,
  schema,
}: AgenticRagParams<T>): Promise<AgenticRagResult<T>> {
  const agenticStart = Date.now()

  console.log('[agentic-rag] Invoked agentic RAG pipeline')
  if (SHOW_DEBUG_LOGS) {
    const changePreview =
      changeDescription.substring(0, 100) + (changeDescription.length > 100 ? '...' : '')
    console.log('[agentic-rag] Starting agentic RAG analysis', {
      role,
      changeDescription: changePreview,
      hasContext: !!context,
      agentType: AGENT_TYPE.AGENTIC_RAG,
    })
  }

  try {
    const query = buildQueryText(role, changeDescription, context)
    const embedding = await embedImpactQuery(query)
    const matches = await matchImpactChunks({ embedding, role })

    const filtered = matches
      .filter(match => match.similarity >= RAG_CONFIG.FALLBACK_SIMILARITY)
      .slice(0, RAG_CONFIG.MATCH_COUNT)

    if (SHOW_DEBUG_LOGS) {
      console.log('[agentic-rag] RAG context assessment', {
        totalMatches: matches.length,
        filteredMatches: filtered.length,
        minRequired: RAG_CONFIG.MIN_RESULTS,
        fallbackSimilarity: RAG_CONFIG.FALLBACK_SIMILARITY,
        sufficientContext: filtered.length >= RAG_CONFIG.MIN_RESULTS,
      })
    }

    if (filtered.length < RAG_CONFIG.MIN_RESULTS) {
      if (SHOW_DEBUG_LOGS) {
        console.log('[agentic-rag] Insufficient RAG context - skipping agentic RAG', {
          reason: 'insufficient-context',
          matchCount: filtered.length,
          required: RAG_CONFIG.MIN_RESULTS,
          fallbackStrategy: 'will use single-agent approach',
        })
      }
      return { strategy: AGENT_TYPE.AGENTIC_RAG, skipped: true, reason: 'insufficient-context' }
    }

    if (SHOW_DEBUG_LOGS) {
      console.log('[agentic-rag] Building dynamic prompt enhancement')
    }
    const promptEnhancement = await buildDynamicPrompt({
      role,
      changeDescription,
      context: typeof context === 'string' ? context : undefined,
      baseSystemPrompt: IMPACT_ANALYSIS_SYSTEM_PROMPT,
      matches: filtered,
    })

    // Use dynamic prompt-enhanced user prompt
    const prompt = `**Context-Aware Impact Analysis**

You are analyzing an organizational change with enhanced context from both role expertise and historical data.

**Current Change Request:**
- **Role**: ${role}
- **Change**: ${changeDescription}
${context ? `- **Additional Context**: ${typeof context === 'string' ? context : JSON.stringify(context)}` : ''}

**Dynamic Analysis Instructions:**
${
  promptEnhancement.ragInsights
    ? `
**Historical Insights Available:**
${promptEnhancement.ragInsights}

Use these insights to inform your analysis, but don't be constrained by them. Focus on patterns and lessons learned.
`
    : '**Note**: No historical data available - provide fresh analysis based on general expertise.'
}

**Role-Specific Guidance:**
As a ${role}, your analysis should prioritize: ${promptEnhancement.focusAreas.join(', ')}

**Task**: Provide a comprehensive impact analysis using the ChangeSim schema. Integrate historical insights where relevant and highlight role-specific considerations.

Respond with valid JSON that satisfies the schema.`

    if (SHOW_DEBUG_LOGS) {
      console.log('[agentic-rag] Enhanced prompt composition:', {
        systemPromptLength: promptEnhancement.enhancedSystemPrompt.length,
        userPromptLength: prompt.length,
        focusAreas: promptEnhancement.focusAreas,
        ragInsightsPresent: !!promptEnhancement.ragInsights,
        roleContextLength: promptEnhancement.roleContext.length,
      })
    }

    if (SHOW_DEBUG_LOGS) {
      console.log('[agentic-rag] Calling AI model with enhanced prompts', {
        model: impactModel.modelId,
        temperature: TEMPERATURE,
        maxTokens: MAX_OUTPUT_TOKENS,
        enhancedSystemPrompt: true,
        contextualUserPrompt: true,
      })
    }

    const aiStart = Date.now()
    const result = await generateObject({
      model: impactModel,
      system: promptEnhancement.enhancedSystemPrompt,
      prompt,
      schema,
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    })
    const aiDuration = Date.now() - aiStart

    const diagnostics: AgenticRagDiagnostics = {
      matchCount: filtered.length,
      averageSimilarity:
        filtered.reduce((sum, match) => sum + (match.similarity ?? 0), 0) / filtered.length,
      retrievalIds: filtered.map(match => match.chunk_id),
      roleContext: promptEnhancement.roleContext,
      focusAreas: promptEnhancement.focusAreas,
      dynamicPromptUsed: true,
    }

    const totalDuration = Date.now() - agenticStart
    if (SHOW_DEBUG_LOGS) {
      console.log('[agentic-rag] Agentic RAG analysis completed successfully', {
        durationMs: totalDuration,
        aiCallDurationMs: aiDuration,
        agentType: AGENT_TYPE.AGENTIC_RAG,
        diagnostics: {
          matchCount: diagnostics.matchCount,
          averageSimilarity: diagnostics.averageSimilarity.toFixed(3),
          focusAreas: diagnostics.focusAreas,
          dynamicPromptUsed: diagnostics.dynamicPromptUsed,
        },
        tokenUsage: result.usage,
      })
    }

    return { strategy: AGENT_TYPE.AGENTIC_RAG, diagnostics, ...result }
  } catch (error) {
    const errorDuration = Date.now() - agenticStart
    console.warn('[agentic-rag] Agentic RAG attempt failed, falling back to single-agent strategy')
    if (SHOW_DEBUG_LOGS) {
      console.error('[agentic-rag] Agentic RAG analysis failed after', errorDuration + 'ms:', {
        error: (error as Error).message,
        role,
        agentType: AGENT_TYPE.AGENTIC_RAG,
        fallbackStrategy: 'will use single-agent approach',
      })
    }
    return { strategy: AGENT_TYPE.AGENTIC_RAG, error: error as Error }
  }
}
