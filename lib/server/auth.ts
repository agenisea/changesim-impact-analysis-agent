import { NextRequest } from 'next/server'

const API_TOKEN = process.env.API_TOKEN

/**
 * Validates API token from request headers
 */
export function validateApiToken(request: NextRequest): boolean {
  if (!API_TOKEN) {
    console.warn('[auth] No API_TOKEN configured - allowing all requests')
    return true
  }

  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === API_TOKEN
  }

  const apiKeyHeader = request.headers.get('X-API-Key')
  if (apiKeyHeader) {
    return apiKeyHeader === API_TOKEN
  }

  return false
}

/**
 * Creates unauthorized response
 */
export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Valid API token required'
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer'
      }
    }
  )
}

/**
 * Checks if request is from same origin (internal frontend calls)
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  if (!referer || !host) {
    return false
  }

  try {
    const refererUrl = new URL(referer)
    return refererUrl.host === host
  } catch {
    return false
  }
}

/**
 * Auth middleware for API routes
 * Allows same-origin requests (internal frontend calls) without token
 * Requires API token for external requests
 */
export function withAuth(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    // Allow same-origin requests (internal frontend calls)
    if (isSameOriginRequest(request)) {
      return handler(request)
    }

    // Require API token for external requests
    if (!validateApiToken(request)) {
      return createUnauthorizedResponse()
    }

    // Call the handler and let it handle its own errors
    return handler(request)
  }
}