import { type ImpactAnalysisInput } from '@/types/impact-analysis'
import { sb } from '@/lib/db/client'
import { COMPOSITE_CHUNK_TYPES, type CompositeChunkType } from '@/lib/utils/constants'

const SHOW_DEBUG_LOGS = process.env.SHOW_DEBUG_LOGS === 'true'

/**
 * Enhanced similarity search with chunk-type specificity for agentic RAG
 */

// Pattern Analysis Agent - focuses on organizational change patterns
export async function getPatternAnalysisContext(
  input: ImpactAnalysisInput,
  limit: number = 8
): Promise<{
  changeRisks: Array<{ content: string; similarity: number; role: string }>
  contextAnalysis: Array<{ content: string; similarity: number; role: string }>
  roleChangeContext: Array<{ content: string; similarity: number; role: string }>
}> {
  try {
    if (SHOW_DEBUG_LOGS) {
      console.log('[enhanced-embeddings] Getting Pattern Analysis context')
    }

    // Get change-risk patterns from similar organizational changes
    const { data: changeRisks } = await sb.rpc('search_similar_chunks_by_type', {
      query_text: `${input.changeDescription}`,
      chunk_type: COMPOSITE_CHUNK_TYPES.CHANGE_RISKS,
      match_threshold: 0.65,
      match_count: limit / 2
    })

    // Get contextual analysis patterns
    const { data: contextAnalysis } = await sb.rpc('search_similar_chunks_by_type', {
      query_text: `organizational change ${input.changeDescription}`,
      chunk_type: COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS,
      match_threshold: 0.60,
      match_count: limit / 4
    })

    // Get role-change context for broader patterns
    const { data: roleChangeContext } = await sb.rpc('search_similar_chunks_by_type', {
      query_text: input.changeDescription,
      chunk_type: COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT,
      match_threshold: 0.70,
      match_count: limit / 4
    })

    return {
      changeRisks: changeRisks || [],
      contextAnalysis: contextAnalysis || [],
      roleChangeContext: roleChangeContext || []
    }
  } catch (error) {
    console.error('[enhanced-embeddings] Pattern Analysis context failed:', error)
    return { changeRisks: [], contextAnalysis: [], roleChangeContext: [] }
  }
}

// Role-Specific Agent - focuses on role-specific challenges and adaptations
export async function getRoleSpecificContext(
  input: ImpactAnalysisInput,
  limit: number = 10
): Promise<{
  roleChangeMatches: Array<{ content: string; similarity: number; role: string }>
  roleContextAnalysis: Array<{ content: string; similarity: number; role: string }>
  crossRoleInsights: Array<{ content: string; similarity: number; role: string }>
}> {
  try {
    if (SHOW_DEBUG_LOGS) {
      console.log('[enhanced-embeddings] Getting Role-Specific context')
    }

    // Primary: Direct role-change matches
    const { data: roleChangeMatches } = await sb.rpc('search_similar_chunks_by_type', {
      query_text: `${input.role} ${input.changeDescription}`,
      chunk_type: COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT,
      match_threshold: 0.75,
      match_count: Math.ceil(limit * 0.6)
    })

    // Secondary: Role-specific contextual analysis
    const { data: roleContextAnalysis } = await sb.rpc('search_similar_chunks_by_role', {
      target_role: input.role,
      chunk_type: COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS,
      match_count: Math.ceil(limit * 0.3)
    })

    // Tertiary: Cross-role insights for similar changes
    const { data: crossRoleInsights } = await sb.rpc('search_similar_chunks_by_type', {
      query_text: input.changeDescription,
      chunk_type: COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT,
      match_threshold: 0.65,
      match_count: Math.ceil(limit * 0.1)
    })

    return {
      roleChangeMatches: roleChangeMatches || [],
      roleContextAnalysis: roleContextAnalysis || [],
      crossRoleInsights: crossRoleInsights || []
    }
  } catch (error) {
    console.error('[enhanced-embeddings] Role-Specific context failed:', error)
    return { roleChangeMatches: [], roleContextAnalysis: [], crossRoleInsights: [] }
  }
}

// Cross-Reference Agent - synthesizes insights from historical data
export async function getCrossReferenceContext(
  input: ImpactAnalysisInput,
  currentRiskLevel: string,
  limit: number = 12
): Promise<{
  riskLevelMatches: Array<{ content: string; similarity: number; role: string; riskLevel?: string }>
  historicalSources: Array<{ content: string; similarity: number; role: string }>
  comparativeAnalysis: Array<{ content: string; similarity: number; role: string }>
}> {
  try {
    if (SHOW_DEBUG_LOGS) {
      console.log('[enhanced-embeddings] Getting Cross-Reference context')
    }

    // Risk-level specific comparisons
    const { data: riskLevelMatches } = await sb.rpc('search_similar_risk_level', {
      query_text: input.changeDescription,
      risk_level: currentRiskLevel,
      match_count: Math.ceil(limit * 0.4)
    })

    // Historical source patterns
    const { data: historicalSources } = await sb.rpc('search_similar_chunks_by_type', {
      query_text: `${input.changeDescription} lessons learned best practices`,
      chunk_type: COMPOSITE_CHUNK_TYPES.SOURCES,
      match_threshold: 0.60,
      match_count: Math.ceil(limit * 0.3)
    })

    // Comparative analysis across all change types
    const { data: comparativeAnalysis } = await sb.rpc('search_similar_chunks_by_type', {
      query_text: `${input.role} organizational change impact`,
      chunk_type: COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS,
      match_threshold: 0.65,
      match_count: Math.ceil(limit * 0.3)
    })

    return {
      riskLevelMatches: riskLevelMatches || [],
      historicalSources: historicalSources || [],
      comparativeAnalysis: comparativeAnalysis || []
    }
  } catch (error) {
    console.error('[enhanced-embeddings] Cross-Reference context failed:', error)
    return { riskLevelMatches: [], historicalSources: [], comparativeAnalysis: [] }
  }
}

/**
 * Optimized parallel context retrieval for maximum performance
 */
export async function getParallelSpecializedContext(
  input: ImpactAnalysisInput,
  currentRiskLevel?: string
): Promise<{
  riskContext: Array<{ content: string; similarity: number; role: string }>
  contextAnalysisContext: Array<{ content: string; similarity: number; role: string }>
  roleContext: Array<{ content: string; similarity: number; role: string }>
  sourcesContext: Array<{ content: string; similarity: number; role: string }>
  summary: {
    totalRetrievedChunks: number
    chunkTypeBreakdown: Record<CompositeChunkType, number>
    averageSimilarity: number
  }
}> {
  try {
    if (SHOW_DEBUG_LOGS) {
      console.log('[enhanced-embeddings] Starting parallel specialized context retrieval')
    }

    // Retrieve all context types in parallel for maximum performance
    const [riskContext, contextAnalysisContext, roleContext, sourcesContext] = await Promise.all([
      // Risk Analysis Agent context
      sb.rpc('search_similar_chunks_by_type', {
        query_text: `${input.changeDescription} risks challenges pitfalls`,
        chunk_type: COMPOSITE_CHUNK_TYPES.CHANGE_RISKS,
        match_threshold: 0.65,
        match_count: 8
      }).then(({ data }) => data || []),

      // Context Analysis Agent context
      sb.rpc('search_similar_chunks_by_type', {
        query_text: `organizational change ${input.changeDescription} context implications`,
        chunk_type: COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS,
        match_threshold: 0.60,
        match_count: 8
      }).then(({ data }) => data || []),

      // Role Specialist Agent context
      sb.rpc('search_similar_chunks_by_type', {
        query_text: `${input.role} ${input.changeDescription}`,
        chunk_type: COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT,
        match_threshold: 0.70,
        match_count: 8
      }).then(({ data }) => data || []),

      // Historical Sources Agent context
      sb.rpc('search_similar_chunks_by_type', {
        query_text: `${input.changeDescription} lessons learned best practices`,
        chunk_type: COMPOSITE_CHUNK_TYPES.SOURCES,
        match_threshold: 0.60,
        match_count: 6
      }).then(({ data }) => data || [])
    ])

    // Calculate summary statistics
    const allChunks = [...riskContext, ...contextAnalysisContext, ...roleContext, ...sourcesContext]
    const totalRetrievedChunks = allChunks.length
    const averageSimilarity = allChunks.length > 0
      ? allChunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) / allChunks.length
      : 0

    const chunkTypeBreakdown = {
      [COMPOSITE_CHUNK_TYPES.CHANGE_RISKS]: riskContext.length,
      [COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS]: contextAnalysisContext.length,
      [COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT]: roleContext.length,
      [COMPOSITE_CHUNK_TYPES.SOURCES]: sourcesContext.length
    }

    if (SHOW_DEBUG_LOGS) {
      console.log(`[enhanced-embeddings] Parallel retrieval: ${totalRetrievedChunks} chunks across 4 specialized contexts`)
      console.log(`[enhanced-embeddings] Average similarity: ${averageSimilarity.toFixed(3)}`)
    }

    return {
      riskContext,
      contextAnalysisContext,
      roleContext,
      sourcesContext,
      summary: {
        totalRetrievedChunks,
        chunkTypeBreakdown,
        averageSimilarity
      }
    }
  } catch (error) {
    console.error('[enhanced-embeddings] Parallel specialized context failed:', error)
    throw error
  }
}

/**
 * Unified contextual retrieval for enhanced agentic analysis
 */
export async function getEnhancedContextualMemory(
  input: ImpactAnalysisInput,
  currentRiskLevel?: string
): Promise<{
  patternContext: Awaited<ReturnType<typeof getPatternAnalysisContext>>
  roleContext: Awaited<ReturnType<typeof getRoleSpecificContext>>
  crossRefContext: Awaited<ReturnType<typeof getCrossReferenceContext>>
  summary: {
    totalRetrievedChunks: number
    chunkTypeBreakdown: Record<CompositeChunkType, number>
    averageSimilarity: number
  }
}> {
  try {
    if (SHOW_DEBUG_LOGS) {
      console.log('[enhanced-embeddings] Starting enhanced contextual memory retrieval')
    }

    // Retrieve context for all three agents in parallel
    const [patternContext, roleContext, crossRefContext] = await Promise.all([
      getPatternAnalysisContext(input, 8),
      getRoleSpecificContext(input, 10),
      getCrossReferenceContext(input, currentRiskLevel || 'medium', 12)
    ])

    // Calculate summary statistics
    const allChunks = [
      ...patternContext.changeRisks,
      ...patternContext.contextAnalysis,
      ...patternContext.roleChangeContext,
      ...roleContext.roleChangeMatches,
      ...roleContext.roleContextAnalysis,
      ...roleContext.crossRoleInsights,
      ...crossRefContext.riskLevelMatches,
      ...crossRefContext.historicalSources,
      ...crossRefContext.comparativeAnalysis
    ]

    const totalRetrievedChunks = allChunks.length
    const averageSimilarity = allChunks.length > 0
      ? allChunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) / allChunks.length
      : 0

    // Count chunk types (would need to track this in the actual implementation)
    const chunkTypeBreakdown = {
      [COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT]: patternContext.roleChangeContext.length + roleContext.roleChangeMatches.length + roleContext.crossRoleInsights.length,
      [COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS]: patternContext.contextAnalysis.length + roleContext.roleContextAnalysis.length + crossRefContext.comparativeAnalysis.length,
      [COMPOSITE_CHUNK_TYPES.CHANGE_RISKS]: patternContext.changeRisks.length,
      [COMPOSITE_CHUNK_TYPES.SOURCES]: crossRefContext.historicalSources.length
    }

    if (SHOW_DEBUG_LOGS) {
      console.log(`[enhanced-embeddings] Retrieved ${totalRetrievedChunks} chunks across ${Object.keys(chunkTypeBreakdown).length} types`)
      console.log(`[enhanced-embeddings] Average similarity: ${averageSimilarity.toFixed(3)}`)
    }

    return {
      patternContext,
      roleContext,
      crossRefContext,
      summary: {
        totalRetrievedChunks,
        chunkTypeBreakdown,
        averageSimilarity
      }
    }
  } catch (error) {
    console.error('[enhanced-embeddings] Enhanced contextual memory failed:', error)
    throw error
  }
}