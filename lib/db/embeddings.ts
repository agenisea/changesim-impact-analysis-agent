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

let missingRpcWarningIssued = false

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

  if (typeof sb.rpc !== 'function') {
    if (!missingRpcWarningIssued && SHOW_DEBUG_LOGS) {
      console.warn('[embedding] Supabase client missing rpc() - skipping chunk persistence')
      missingRpcWarningIssued = true
    }
    return
  }

  // Add detailed logging and timeout wrapper for debugging
  console.log(`[embedding] About to insert chunks for run_id: ${chunks[0]?.run_id}`)

  try {
    const insertStart = Date.now()
    console.log(`[embedding] Starting database insert at ${new Date(insertStart).toISOString()}`)

    // Insert chunks one by one to handle duplicates gracefully
    console.log(`[embedding] Inserting ${chunks.length} chunks individually to handle duplicates`)

    let successCount = 0
    for (const chunk of chunks) {
      try {
        // Ensure we have all required fields for the insert
        const insertData = {
          run_id: chunk.run_id,
          org_role: chunk.org_role,
          composite: chunk.composite,
          chunk_idx: chunk.chunk_idx,
          content: chunk.content
          // chunk_id will be auto-generated
          // embedding will be null initially
          // created_at will be auto-generated
        }

        console.log(`[embedding] Inserting chunk data:`, {
          run_id: insertData.run_id,
          org_role: insertData.org_role,
          composite: insertData.composite,
          chunk_idx: insertData.chunk_idx,
          content_length: insertData.content?.length || 0
        })

        // Use custom function to bypass Supabase client issues
        console.log(`[embedding] Calling insert_analysis_chunk RPC function`)
        const { data, error } = await sb.rpc('insert_analysis_chunk', {
          p_run_id: insertData.run_id,
          p_org_role: insertData.org_role,
          p_composite: insertData.composite,
          p_chunk_idx: insertData.chunk_idx,
          p_content: insertData.content
        })

        console.log(`[embedding] RPC response:`, { data, error })

        if (error) {
          console.error(`[embedding] RPC call failed:`, error.message)
        } else if (data && data.success) {
          successCount++
          console.log(`[embedding] Chunk inserted successfully: ${data.chunk_id}`)
        } else if (data && !data.success) {
          if (data.error_code === '23505') {
            console.log(`[embedding] Chunk already exists: run_id=${chunk.run_id}, composite=${chunk.composite}, idx=${chunk.chunk_idx}`)
          } else {
            console.error(`[embedding] Failed to insert chunk:`, data.message)
          }
        } else {
          console.error(`[embedding] Unexpected response format:`, { data, error })
        }
      } catch (insertError) {
        console.error(`[embedding] Insert error for chunk:`, (insertError as Error).message)
      }
    }

    console.log(`[embedding] Successfully inserted ${successCount}/${chunks.length} chunks`)

    // If no chunks were inserted successfully, throw an error
    if (successCount === 0) {
      throw new Error(`Failed to insert any chunks`)
    }

    const insertDuration = Date.now() - insertStart
    console.log(`[embedding] Insert completed in ${insertDuration}ms`)

    console.log(`[embedding] Successfully processed ${chunks.length} chunks for run: ${chunks[0]?.run_id}`)

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
    // Don't re-throw - let the main analysis succeed even if embeddings fail
    console.log(`[embedding] Continuing without embeddings for run: ${runId}`)
  }
}
