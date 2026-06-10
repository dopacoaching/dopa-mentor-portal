import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, isAuthResult } from '@/lib/middleware'
import Notification from '@/models/Notification'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json().catch(() => ({}))
  const { id } = body

  if (id) {
    await Notification.findOneAndUpdate(
      { _id: id, recipientId: authResult.user.userId },
      { isRead: true }
    )
  } else {
    await Notification.updateMany(
      { recipientId: authResult.user.userId, isRead: false },
      { isRead: true }
    )
  }

  return NextResponse.json({ success: true })
}
