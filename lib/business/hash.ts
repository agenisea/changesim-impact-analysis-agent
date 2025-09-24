import crypto from 'crypto'

/**
 * Creates a deterministic hash for impact analysis inputs
 * Used for session-scoped caching to avoid duplicate analyses
 */
export function makeInputHash(payload: {
  role: string
  changeDescription: string
  context?: any
  model: string
  promptVersion: string
}) {
  // Canonicalize inputs to ensure consistent hashing
  const contextString = payload.context
    ? (typeof payload.context === 'string' ? payload.context.trim() : JSON.stringify(payload.context))
    : ''

  const canonical = JSON.stringify({
    role: payload.role.trim(),
    changeDescription: payload.changeDescription.trim(),
    context: contextString,
    model: payload.model,
    promptVersion: payload.promptVersion,
  })

  return crypto.createHash('sha256').update(canonical).digest('hex')
}