import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import TaskLog from '@/models/TaskLog'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { sendToRole } from '@/lib/sse'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const stale = await TaskLog.find({ status: 'submitted', createdAt: { $lt: cutoff } })
    .populate('mentorId', 'name')

  if (stale.length > 0) {
    const msg = `${stale.length} task submission${stale.length > 1 ? 's have' : ' has'} been unverified for more than 24 hours.`

    // Send SSE to all admins in real-time
    sendToRole('admin', { type: 'notification', data: { message: msg, type: 'unverified_tasks' } })

    // Create a notification for every admin so it appears in their bell
    const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').lean()
    await Promise.all(
      admins.map((admin) =>
        Notification.create({
          recipientId: admin._id,
          type: 'unverified_tasks',
          message: msg,
        })
      )
    )
  }

  return NextResponse.json({ staleCount: stale.length })
}
