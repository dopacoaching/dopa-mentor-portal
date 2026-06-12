import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, isAuthResult } from '@/lib/middleware'
import Notification from '@/models/Notification'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))

  const notifications = await Notification.find({ recipientId: authResult.user.userId })
    .sort({ createdAt: -1 })
    .limit(limit)

  return NextResponse.json({ notifications })
}
