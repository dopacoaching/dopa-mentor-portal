import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listNotifications } from '@/lib/services/notifications.service'

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request)
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 20)
    const notifications = await listNotifications(user.userId, limit)
    return NextResponse.json({ notifications })
  } catch (error) {
    return handleApiError(error)
  }
}
