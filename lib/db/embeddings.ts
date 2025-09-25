import { randomUUID } from 'crypto'
import { type ImpactAnalysisResult } from '@/types/impact-analysis'
import { sb } from '@/lib/db/client'
import { retryFetch } from '@/lib/utils/fetch'
import { EMBEDDING_CONFIG, COMPOSITE_CHUNK_TYPES, type CompositeChunkType } from '@/lib/utils/constants'

const SHOW_DEBUG_LOGS = process.env.SHOW_DEBUG_LOGS === 'true'

// Database and API constants
const CHUNKS_TABLE = 'changesim_impact_analysis_run_chunks'
const EDGE_FUNCTIONS_PATH = '/functions/v1'
const EMBEDDING_PROCESSOR_FUNCTION = 'embedding-processor'
const UNKNOWN_ERROR_MESSAGE = 'Unknown error'

export interface AnalysisChunk {
  chunk_id: string
  run_id: string
  org_role: string | null
  composite: CompositeChunkType
  chunk_idx: number
  content: string
}

/**
 * Creates composite chunks that combine related fields for better agent context.
 * This provides richer semantic meaning than individual atomic chunks.
 */
export function createAnalysisChunks(
  result: ImpactAnalysisResult,
  runId: string,
  role: string,
  changeDescription: string,
  context?: string
): AnalysisChunk[] {
  const chunks: AnalysisChunk[] = []
  let chunkIndex = 0

  // Composite Chunk 1: Role + Change Description + Context
  const roleChangeContextContent = [
    `Role: ${role}`,
    `Change Description: ${changeDescription}`,
    context?.trim() ? `Context: ${context}` : null,
  ].filter(Boolean).join('\n\n')

  chunks.push({
    chunk_id: randomUUID(),
    run_id: runId,
    org_role: role,
    composite: COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT,
    content: roleChangeContextContent,
    chunk_idx: chunkIndex++,
  })

  // Composite Chunk 2: Context + Analysis Summary
  if (context?.trim() || result.analysis_summary?.trim()) {
    const contextAnalysisContent = [
      context?.trim() ? `Context: ${context}` : null,
      result.analysis_summary?.trim() ? `Analysis Summary: ${result.analysis_summary}` : null,
    ].filter(Boolean).join('\n\n')

    if (contextAnalysisContent) {
      chunks.push({
        chunk_id: randomUUID(),
        run_id: runId,
        org_role: role,
        composite: COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS,
        content: contextAnalysisContent,
        chunk_idx: chunkIndex++,
      })
    }
  }

  // Composite Chunk 3: Change + Risks
  if (result.risk_factors?.length) {
    const changeRisksContent = [
      `Change Description: ${changeDescription}`,
      `Risk Factors:\n${result.risk_factors.map(risk => `• ${risk}`).join('\n')}`,
    ].join('\n\n')

    chunks.push({
      chunk_id: randomUUID(),
      run_id: runId,
      org_role: role,
      composite: COMPOSITE_CHUNK_TYPES.CHANGE_RISKS,
      content: changeRisksContent,
      chunk_idx: chunkIndex++,
    })
  }

  // Composite Chunk 4: Sources
  if (result.sources?.length) {
    const sourcesContent = `Sources:\n${result.sources.map(source => `• ${source.title}: ${source.url}`).join('\n')}`

    chunks.push({
      chunk_id: randomUUID(),
      run_id: runId,
      org_role: role,
      composite: COMPOSITE_CHUNK_TYPES.SOURCES,
      content: sourcesContent,
      chunk_idx: chunkIndex++,
    })
  }

  return chunks
}

/**
 * Insert chunks - DB trigger will automatically enqueue embedding jobs
 */
export async function insertAnalysisChunks(chunks: AnalysisChunk[]): Promise<void> {
  if (chunks.length === 0) {
    if (SHOW_DEBUG_LOGS) {
      console.log('[chunking] No chunks to insert')
    }
    return
  }

  if (SHOW_DEBUG_LOGS) {
    console.log(`[chunking] Inserting ${chunks.length} chunks`)
  }

  const { error } = await sb
    .from(CHUNKS_TABLE)
    .insert(chunks)

  if (error) {
    const errorMsg = `Failed to insert chunks: ${error.message}`
    console.error('[chunking]', errorMsg)
    throw new Error(errorMsg)
  }

  if (SHOW_DEBUG_LOGS) {
    console.log(`[chunking] Successfully inserted ${chunks.length} chunks`)
  }
}

/**
 * Call embedding-processor edge function to process embedding job queue
 */
export async function triggerEmbeddingProcessor(): Promise<{ processed: number }> {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !serviceKey) {
    const errorMsg = 'Missing SUPABASE_URL or SUPABASE_KEY environment variables'
    console.error('[chunking]', errorMsg)
    throw new Error(errorMsg)
  }

  if (SHOW_DEBUG_LOGS) {
    console.log('[chunking] Triggering embedding processor')
  }

  try {
    const response = await retryFetch(
      `${supabaseUrl}${EDGE_FUNCTIONS_PATH}/${EMBEDDING_PROCESSOR_FUNCTION}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      },
      {
        maxAttempts: EMBEDDING_CONFIG.MAX_RETRIES,
        baseDelayMs: EMBEDDING_CONFIG.RETRY_DELAY_MS
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => UNKNOWN_ERROR_MESSAGE)
      const errorMsg = `embedding-processor call failed: ${response.status} - ${errorText}`
      console.error('[chunking]', errorMsg)
      throw new Error(errorMsg)
    }

    const result = await response.json()

    if (SHOW_DEBUG_LOGS) {
      console.log(`[chunking] Embedding processor completed: ${result.processed} jobs processed`)
    }

    return result
  } catch (error) {
    const errorMsg = `Embedding processor failed: ${(error as Error).message}`
    console.error('[chunking]', errorMsg)
    throw new Error(errorMsg)
  }
}

/**
 * Main function: chunk analysis and trigger embedding processing
 */
export async function chunkAndEmbedAnalysis(
  result: ImpactAnalysisResult,
  runId: string,
  role: string,
  changeDescription: string,
  context?: string
): Promise<void> {
  try {
    if (SHOW_DEBUG_LOGS) {
      console.log(`[chunking] Starting embedding process for run: ${runId}`)
    }

    // 1. Create chunks from analysis result
    const chunks = createAnalysisChunks(result, runId, role, changeDescription, context)

    if (chunks.length === 0) {
      if (SHOW_DEBUG_LOGS) {
        console.log('[chunking] No chunks to embed - skipping')
      }
      return
    }

    // 2. Insert chunks (DB trigger enqueues jobs automatically)
    await insertAnalysisChunks(chunks)
    console.log(`[chunking] Inserted ${chunks.length} chunks - jobs enqueued by trigger`)

    // 3. Call edge function to process the queue
    const processingResult = await triggerEmbeddingProcessor()
    console.log(`[chunking] Embedding processor: ${processingResult.processed} jobs processed`)

    if (SHOW_DEBUG_LOGS) {
      console.log(`[chunking] Embedding process completed successfully for run: ${runId}`)
    }
  } catch (error) {
    console.error(`[chunking] Embedding process failed for run ${runId}:`, (error as Error).message)
    // Re-throw to allow caller to handle as needed
    throw error
  }
}