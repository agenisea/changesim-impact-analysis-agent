import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/server/auth'

/**
 * Health check endpoint for Fly.io monitoring
 * Returns 200 OK if the application is healthy
 */
async function _GET() {
  try {
    // Basic health check - verify the app is responsive
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'changesim-impact-analysis'
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    // Log error details server-side only, don't expose in response
    console.error('[impact-analysis] Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Export auth-protected version
export const GET = withAuth(_GET)