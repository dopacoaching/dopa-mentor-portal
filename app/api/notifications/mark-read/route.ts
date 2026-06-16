import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { markNotificationsRead } from '@/lib/services/notifications.service'

export async function POST(request: NextRequest) {
  try {
    const user = authenticate(request)
    const body = await request.json().catch(() => ({}))
    await markNotificationsRead(user.userId, body.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
