import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import TaskLog from '@/models/TaskLog'
import Notification from '@/models/Notification'
import { sendToRole } from '@/lib/sse'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const now = new Date()
  const mentors = await User.find({ role: 'mentor', isActive: true }).select('_id name region')

  let flagged = 0
  for (const mentor of mentors) {
    const last4days: string[] = []
    for (let i = 1; i <= 4; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      last4days.push(d.toDateString())
    }

    const logs = await TaskLog.find({
      mentorId: mentor._id,
      date: { $gte: new Date(now.getTime() - 4 * 86400000) },
    })

    const misses = last4days.filter((ds) => {
      const log = logs.find((l) => new Date(l.date).toDateString() === ds)
      return !log || log.status === 'auto_closed'
    })

    if (misses.length >= 3) {
      const alreadyNotified = await Notification.findOne({
        type: 'consecutive_miss',
        relatedId: mentor._id,
        createdAt: { $gte: new Date(now.getTime() - 86400000) },
      })
      if (!alreadyNotified) {
        const msg = `${mentor.name} has missed tasks for ${misses.length} consecutive days.`
        const notif = await Notification.create({
          recipientId: mentor._id,
          type: 'consecutive_miss',
          message: msg,
          relatedId: mentor._id,
        })
        sendToRole('admin', { type: 'notification', data: notif.toObject() })
        flagged++
      }
    }
  }

  return NextResponse.json({ checked: mentors.length, flagged })
}
