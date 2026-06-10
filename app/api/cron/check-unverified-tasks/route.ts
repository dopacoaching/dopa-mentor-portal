import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import TaskLog from '@/models/TaskLog'
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
    const notif = await Notification.create({
      recipientId: '000000000000000000000000',
      type: 'unverified_tasks',
      message: msg,
    })
    sendToRole('admin', { type: 'notification', data: { ...notif.toObject(), message: msg } })
  }

  return NextResponse.json({ staleCount: stale.length })
}
