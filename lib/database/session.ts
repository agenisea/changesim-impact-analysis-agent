import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

/**
 * Gets or creates a session ID cookie for tracking ChangeSim impact analysis runs
 * This helps group runs by browser session for analytics and session tracking
 */
export async function getSessionIdCookie(): Promise<{ sessionId: string; isNewSession: boolean }> {
  const jar = await cookies()
  let sid = jar.get('changesim_impact_analysis_session')?.value
  let isNewSession = false

  if (!sid) {
    sid = randomUUID()
    isNewSession = true
    jar.set('changesim_impact_analysis_session', sid, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      // No explicit expiry - session cookie that expires when browser closes
    })
  }

  return { sessionId: sid, isNewSession }
}