// lib/tracing.ts
import { randomUUID } from 'crypto'

export interface TraceContext {
  traceId: string
  runId: string
  timestamp: string
  frameworkVersion: string
  userId?: string
  sessionId?: string
}

export interface TraceEvent {
  traceId: string
  eventType: 'principle_validation' | 'perspective_test' | 'human_analysis' | 'plan_generation' | 'subagent_execution' | 'error'
  timestamp: string
  duration?: number
  data: any
  metadata?: Record<string, any>
}

export class ChangesimTracer {
  private events: TraceEvent[] = []
  private startTimes: Map<string, number> = new Map()

  constructor(private context: TraceContext) {}

  static createContext(userId?: string, sessionId?: string): TraceContext {
    return {
      traceId: `cs_${randomUUID()}`,
      runId: `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      frameworkVersion: FRAMEWORK_VERSION,
      userId,
      sessionId
    }
  }

  startEvent(eventType: TraceEvent['eventType'], metadata?: Record<string, any>): string {
    const eventId = `${eventType}_${Date.now()}`
    this.startTimes.set(eventId, performance.now())
    return eventId
  }

  endEvent(eventId: string, eventType: TraceEvent['eventType'], data: any, metadata?: Record<string, any>): void {
    const startTime = this.startTimes.get(eventId)
    const duration = startTime ? performance.now() - startTime : undefined

    this.events.push({
      traceId: this.context.traceId,
      eventType,
      timestamp: new Date().toISOString(),
      duration,
      data,
      metadata
    })

    this.startTimes.delete(eventId)
  }

  logError(error: Error, context?: any): void {
    this.events.push({
      traceId: this.context.traceId,
      eventType: 'error',
      timestamp: new Date().toISOString(),
      data: {
        message: error.message,
        stack: error.stack,
        context
      }
    })
  }

  getTrace(): { context: TraceContext; events: TraceEvent[] } {
    return {
      context: this.context,
      events: [...this.events]
    }
  }

  getSummary(): TraceSummary {
    const eventCounts = this.events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalDuration = this.events
      .filter(e => e.duration)
      .reduce((sum, e) => sum + (e.duration || 0), 0)

    const hasErrors = this.events.some(e => e.eventType === 'error')

    return {
      traceId: this.context.traceId,
      runId: this.context.runId,
      eventCounts,
      totalDuration,
      hasErrors,
      timestamp: this.context.timestamp
    }
  }
}

export interface TraceSummary {
  traceId: string
  runId: string
  eventCounts: Record<string, number>
  totalDuration: number
  hasErrors: boolean
  timestamp: string
}

// Framework version for tracking evolution
export const FRAMEWORK_VERSION = '1.0.0-alpha'

// Global tracer registry for cross-module access
const activeTracers = new Map<string, ChangesimTracer>()

export function getTracer(traceId: string): ChangesimTracer | undefined {
  return activeTracers.get(traceId)
}

export function registerTracer(tracer: ChangesimTracer): void {
  activeTracers.set(tracer.getTrace().context.traceId, tracer)
}

export function clearTracer(traceId: string): void {
  activeTracers.delete(traceId)
}

// Utility for wrapping async operations with tracing
export async function traceAsync<T>(
  tracer: ChangesimTracer,
  eventType: TraceEvent['eventType'],
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const eventId = tracer.startEvent(eventType, metadata)
  try {
    const result = await operation()
    tracer.endEvent(eventId, eventType, { success: true }, metadata)
    return result
  } catch (error) {
    tracer.endEvent(eventId, eventType, { success: false, error: error instanceof Error ? error.message : 'Unknown error' }, metadata)
    tracer.logError(error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

// Trace persistence interface (for future Supabase integration)
export interface TraceStore {
  saveTrace(trace: { context: TraceContext; events: TraceEvent[] }): Promise<void>
  getTrace(traceId: string): Promise<{ context: TraceContext; events: TraceEvent[] } | null>
  getTraceSummaries(limit?: number): Promise<TraceSummary[]>
  getTracesByUser(userId: string, limit?: number): Promise<TraceSummary[]>
}

// Stub implementation
export class InMemoryTraceStore implements TraceStore {
  private traces = new Map<string, { context: TraceContext; events: TraceEvent[] }>()

  async saveTrace(trace: { context: TraceContext; events: TraceEvent[] }): Promise<void> {
    this.traces.set(trace.context.traceId, trace)
    console.log(`[trace] Saved trace ${trace.context.traceId} with ${trace.events.length} events`)
  }

  async getTrace(traceId: string): Promise<{ context: TraceContext; events: TraceEvent[] } | null> {
    return this.traces.get(traceId) || null
  }

  async getTraceSummaries(limit = 50): Promise<TraceSummary[]> {
    return Array.from(this.traces.values())
      .map(trace => new ChangesimTracer(trace.context).getSummary())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  async getTracesByUser(userId: string, limit = 50): Promise<TraceSummary[]> {
    return Array.from(this.traces.values())
      .filter(trace => trace.context.userId === userId)
      .map(trace => new ChangesimTracer(trace.context).getSummary())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }
}

// Global trace store (can be swapped for Supabase implementation)
export const traceStore: TraceStore = new InMemoryTraceStore()