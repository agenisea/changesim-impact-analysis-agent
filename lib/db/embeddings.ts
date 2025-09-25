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
  chunk_id?: string // Optional - let database generate with gen_random_uuid()
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
      console.log('[embedding] No chunks to insert')
    }
    return
  }

  if (SHOW_DEBUG_LOGS) {
    console.log(`[embedding] Inserting ${chunks.length} chunks`)
  }

  // Add detailed logging and timeout wrapper for debugging
  console.log(`[embedding] About to insert chunks for run_id: ${chunks[0]?.run_id}`)

  try {
    const insertStart = Date.now()
    console.log(`[embedding] Starting database insert at ${new Date(insertStart).toISOString()}`)

    // Insert all chunks at once - handles unique constraint uq_run_composite_idx (run_id, composite, chunk_idx)
    console.log(`[embedding] Inserting all chunks with proper constraint handling`)
    const { error } = await Promise.race([
      sb.from(CHUNKS_TABLE).insert(chunks),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database insert timeout after 15 seconds')), 15000)
      )
    ]) as { error: any }

    const insertDuration = Date.now() - insertStart
    console.log(`[embedding] Insert completed in ${insertDuration}ms`)

    if (error) {
      console.error('[embedding] Database error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        run_id: chunks[0]?.run_id,
        chunk_count: chunks.length
      })
      throw new Error(`Failed to insert chunks: ${error.message}`)
    }

    console.log(`[embedding] Successfully inserted ${chunks.length} chunks for run: ${chunks[0]?.run_id}`)

  } catch (err) {
    const error = err as Error
    console.error('[embedding] Insert operation failed:', {
      error_message: error.message,
      error_name: error.name,
      run_id: chunks[0]?.run_id,
      chunk_count: chunks.length,
      timestamp: new Date().toISOString()
    })
    throw error
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
    console.error('[embedding]', errorMsg)
    throw new Error(errorMsg)
  }

  if (SHOW_DEBUG_LOGS) {
    console.log('[embedding] Triggering embedding processor')
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
      console.error('[embedding]', errorMsg)
      throw new Error(errorMsg)
    }

    const result = await response.json()

    if (SHOW_DEBUG_LOGS) {
      console.log(`[embedding] Embedding processor completed: ${result.processed} jobs processed`)
    }

    return result
  } catch (error) {
    const errorMsg = `Embedding processor failed: ${(error as Error).message}`
    console.error('[embedding]', errorMsg)
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
      console.log(`[embedding] Starting embedding process for run: ${runId}`)
    }

    // 1. Create chunks from analysis result
    const chunks = createAnalysisChunks(result, runId, role, changeDescription, context)

    if (chunks.length === 0) {
      if (SHOW_DEBUG_LOGS) {
        console.log('[embedding] No chunks to embed - skipping')
      }
      return
    }

    // 2. Insert chunks (DB trigger enqueues jobs automatically)
    await insertAnalysisChunks(chunks)
    console.log(`[embedding] Inserted ${chunks.length} chunks - jobs enqueued by trigger`)

    // 3. Call edge function to process the queue
    const processingResult = await triggerEmbeddingProcessor()
    console.log(`[embedding] Embedding processor: ${processingResult.processed} jobs processed`)

    if (SHOW_DEBUG_LOGS) {
      console.log(`[embedding] Embedding process completed successfully for run: ${runId}`)
    }
  } catch (error) {
    console.error(`[embedding] Embedding process failed for run ${runId}:`, (error as Error).message)
    // Re-throw to allow caller to handle as needed
    throw error
  }
}