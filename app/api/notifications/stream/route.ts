import { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { registerConnection, removeConnection } from '@/lib/sse'
import User from '@/models/User'
import { connectDB } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return new Response('Unauthorized', { status: 401 })

  const payload = verifyJWT(token)
  if (!payload) return new Response('Unauthorized', { status: 401 })

  await connectDB()
  const user = await User.findById(payload.userId).select('region')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const conn = registerConnection(payload.userId, payload.role, controller, user?.region ?? undefined)

      controller.enqueue(encoder.encode(': connected\n\n'))

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 25000)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        removeConnection(payload.userId, conn)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
