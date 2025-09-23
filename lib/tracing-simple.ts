// lib/tracing-simple.ts
// Lightweight tracer wrapper for drop-in persistence

import { randomUUID } from 'crypto'
import { persistTraceEvent } from './runs-store'

export type TraceCtx = {
  traceId: string
}

/**
 * Start a new trace context with unique ID.
 */
export function startTrace(): TraceCtx {
  return {
    traceId: randomUUID()
  }
}

/**
 * Wrap an async operation with tracing, automatically recording duration and errors.
 */
export async function traced<T>(
  trace: TraceCtx,
  event_type: string,
  fn: () => Promise<T>,
  ctx?: Record<string, any>
): Promise<T> {
  const t0 = performance.now()

  try {
    const result = await fn()
    const ms = Math.round(performance.now() - t0)

    // Fire-and-forget trace event
    void persistTraceEvent({
      trace_id: trace.traceId,
      event_type,
      ctx: { ok: true, ...(ctx || {}) },
      ms
    })

    return result
  } catch (err: any) {
    const ms = Math.round(performance.now() - t0)

    // Log error event
    void persistTraceEvent({
      trace_id: trace.traceId,
      event_type: 'error',
      ctx: {
        event_type,
        message: err?.message || 'Unknown error',
        ...(ctx || {})
      },
      ms
    })

    throw err
  }
}

/**
 * Record a simple event without timing (for notifications, state changes, etc).
 */
export async function traceEvent(
  trace: TraceCtx,
  event_type: string,
  ctx?: Record<string, any>
): Promise<void> {
  void persistTraceEvent({
    trace_id: trace.traceId,
    event_type,
    ctx: ctx || {}
  })
}

/**
 * Utility for tracing multiple operations in sequence with common context.
 */
export class TraceSession {
  constructor(private trace: TraceCtx, private baseCtx: Record<string, any> = {}) {}

  async run<T>(event_type: string, fn: () => Promise<T>, ctx?: Record<string, any>): Promise<T> {
    return traced(this.trace, event_type, fn, { ...this.baseCtx, ...(ctx || {}) })
  }

  event(event_type: string, ctx?: Record<string, any>): void {
    void traceEvent(this.trace, event_type, { ...this.baseCtx, ...(ctx || {}) })
  }

  get traceId(): string {
    return this.trace.traceId
  }
}