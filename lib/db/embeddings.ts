import { type ImpactAnalysisResult } from '@/types/impact-analysis'
import { sb } from '@/lib/db/client'
import { retryFetch } from '@/lib/utils/fetch'
import {
  EMBEDDING_CONFIG,
  COMPOSITE_CHUNK_TYPES,
  type CompositeChunkType,
} from '@/lib/utils/constants'

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
  context?: unknown
): AnalysisChunk[] {
  const chunks: AnalysisChunk[] = []
  let chunkIndex = 0

  // Normalize context to string for embedding
  const contextString =
    typeof context === 'string' ? context.trim() : context ? JSON.stringify(context) : ''

  // Composite Chunk 1: Role + Change Description + Context
  const roleChangeContextContent = [
    `Role: ${role}`,
    `Change Description: ${changeDescription}`,
    contextString ? `Context: ${contextString}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  chunks.push({
    run_id: runId,
    org_role: role,
    composite: COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT,
    content: roleChangeContextContent,
    chunk_idx: chunkIndex++,
  })

  // Composite Chunk 2: Context + Analysis Summary
  if (contextString || result.analysis_summary?.trim()) {
    const contextAnalysisContent = [
      contextString ? `Context: ${contextString}` : null,
      result.analysis_summary?.trim() ? `Analysis Summary: ${result.analysis_summary}` : null,
    ]
      .filter(Boolean)
      .join('\n\n')

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

  // Composite Chunk 4: Risk Assessment (comprehensive risk information)
  if (result.risk_level && result.risk_rationale && result.risk_scoring) {
    const riskAssessmentContent = [
      `Risk Level: ${result.risk_level}`,
      `Risk Rationale: ${result.risk_rationale}`,
      `Risk Scoring:`,
      `  • Scope: ${result.risk_scoring.scope}`,
      `  • Severity: ${result.risk_scoring.severity}`,
      `  • Human Impact: ${result.risk_scoring.human_impact}`,
      `  • Time Sensitivity: ${result.risk_scoring.time_sensitivity}`
    ].join('\n')

    chunks.push({
      run_id: runId,
      org_role: role,
      composite: COMPOSITE_CHUNK_TYPES.RISK_ASSESSMENT,
      content: riskAssessmentContent,
      chunk_idx: chunkIndex++,
    })
  }

  // Composite Chunk 5: Decision Process (decision-making logic)
  if (result.decision_trace?.length) {
    const decisionProcessContent = [
      `Change Description: ${changeDescription}`,
      `Decision Process:`,
      ...result.decision_trace.map((step, idx) => `${idx + 1}. ${step}`)
    ].join('\n')

    chunks.push({
      run_id: runId,
      org_role: role,
      composite: COMPOSITE_CHUNK_TYPES.DECISION_PROCESS,
      content: decisionProcessContent,
      chunk_idx: chunkIndex++,
    })
  }

  // Composite Chunk 6: Risk Context (risk rationale with contextual factors)
  if (result.risk_level && result.risk_rationale) {
    const riskContextContent = [
      `Risk Level: ${result.risk_level}`,
      `Risk Rationale: ${result.risk_rationale}`,
      contextString ? `Context: ${contextString}` : null,
      result.risk_factors?.length ? `Key Risk Factors:\n${result.risk_factors.map(risk => `• ${risk}`).join('\n')}` : null
    ].filter(Boolean).join('\n\n')

    chunks.push({
      run_id: runId,
      org_role: role,
      composite: COMPOSITE_CHUNK_TYPES.RISK_CONTEXT,
      content: riskContextContent,
      chunk_idx: chunkIndex++,
    })
  }

  // Composite Chunk 7: Sources
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

  if (SHOW_DEBUG_LOGS) {
    console.log(`[embedding] About to insert chunks for run_id: ${chunks[0]?.run_id}`)
  }

  try {
    const insertStart = Date.now()
    if (SHOW_DEBUG_LOGS) {
      console.log(`[embedding] Starting database insert at ${new Date(insertStart).toISOString()}`)
    }

    // Batch insert chunks for efficiency using EMBEDDING_CONFIG.BATCH_SIZE
    console.log(
      `[embedding] Inserting ${chunks.length} chunks in batches of ${EMBEDDING_CONFIG.BATCH_SIZE}`
    )

    let successCount = 0
    for (let i = 0; i < chunks.length; i += EMBEDDING_CONFIG.BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_CONFIG.BATCH_SIZE)

      try {
        // Prepare batch insert data
        const batchData = batch.map(chunk => ({
          run_id: chunk.run_id,
          org_role: chunk.org_role,
          composite: chunk.composite,
          chunk_idx: chunk.chunk_idx,
          content: chunk.content,
        }))

        if (SHOW_DEBUG_LOGS) {
          console.log(
            `[embedding] Inserting batch ${Math.floor(i / EMBEDDING_CONFIG.BATCH_SIZE) + 1}:`,
            {
              batch_size: batch.length,
              run_id: batchData[0]?.run_id,
              content_lengths: batchData.map(d => d.content?.length || 0),
            }
          )
        }

        // Use direct table insert for batch efficiency
        const { data, error } = await sb.from(CHUNKS_TABLE).insert(batchData).select('chunk_id')

        if (error) {
          // Handle duplicate key errors gracefully
          if (error.code === '23505') {
            if (SHOW_DEBUG_LOGS) {
              console.log(`[embedding] Some chunks already exist in batch, continuing`)
            }
            successCount += batch.length // Assume success for duplicates
          } else {
            console.error(`[embedding] Batch insert failed:`, error.message)
            throw error
          }
        } else {
          successCount += data?.length || batch.length
          if (SHOW_DEBUG_LOGS) {
            console.log(
              `[embedding] Batch inserted successfully: ${data?.length || batch.length} chunks`
            )
          }
        }
      } catch (batchError) {
        console.error(`[embedding] Batch insert error:`, (batchError as Error).message)
        // Continue with next batch rather than failing completely
      }
    }

    if (SHOW_DEBUG_LOGS) {
      console.log(`[embedding] Successfully inserted ${successCount}/${chunks.length} chunks`)
    }

    // If no chunks were inserted successfully, throw an error
    if (successCount === 0) {
      throw new Error(`Failed to insert any chunks`)
    }

    const insertDuration = Date.now() - insertStart
    if (SHOW_DEBUG_LOGS) {
      console.log(`[embedding] Insert completed in ${insertDuration}ms`)
      console.log(
        `[embedding] Successfully processed ${chunks.length} chunks for run: ${chunks[0]?.run_id}`
      )
    }
  } catch (err) {
    const error = err as Error
    console.error('[embedding] Insert operation failed:', {
      error_message: error.message,
      error_name: error.name,
      run_id: chunks[0]?.run_id,
      chunk_count: chunks.length,
      timestamp: new Date().toISOString(),
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
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      },
      {
        maxAttempts: EMBEDDING_CONFIG.MAX_RETRIES,
        baseDelayMs: EMBEDDING_CONFIG.RETRY_DELAY_MS,
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
  context?: unknown
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
    console.error(
      `[embedding] Embedding process failed for run ${runId}:`,
      (error as Error).message
    )
    // Don't re-throw - let the main analysis succeed even if embeddings fail
    console.log(`[embedding] Continuing without embeddings for run: ${runId}`)
  }
}
