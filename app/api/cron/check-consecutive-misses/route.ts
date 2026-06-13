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
  const cutoff = new Date(now.getTime() - 4 * 86400000)
  const mentors = await User.find({ role: 'mentor', isActive: { $ne: false } }).select('_id name region')
  const mentorIds = mentors.map((m) => m._id)

  const allLogs = await TaskLog.find({
    mentorId: { $in: mentorIds },
    date: { $gte: cutoff },
  }).lean()

  const last4days: string[] = []
  for (let i = 1; i <= 4; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    last4days.push(d.toDateString())
  }

  // Fetch admins once so we can create stored notifications for them
  const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').lean()

  let flagged = 0
  for (const mentor of mentors) {
    const id = mentor._id.toString()
    const logs = allLogs.filter((l) => l.mentorId.toString() === id)
    const misses = last4days.filter((ds) => {
      const log = logs.find((l) => new Date(l.date).toDateString() === ds)
      return !log || log.status === 'auto_closed'
    })

    if (misses.length >= 3) {
      // Deduplicate: skip if already notified in last 24h
      const alreadyNotified = await Notification.findOne({
        type: 'consecutive_miss',
        relatedId: mentor._id,
        createdAt: { $gte: new Date(now.getTime() - 86400000) },
      })
      if (!alreadyNotified) {
        const msg = `${mentor.name} has missed tasks for ${misses.length} consecutive days.`

        // Create stored notification for each admin so it appears in their bell
        await Promise.all(
          admins.map((admin) =>
            Notification.create({
              recipientId: admin._id,
              type: 'consecutive_miss',
              message: msg,
              relatedId: mentor._id,
            })
          )
        )
        sendToRole('admin', { type: 'notification', data: { type: 'consecutive_miss', message: msg } })
        flagged++
      }
    }
  }

  return NextResponse.json({ checked: mentors.length, flagged })
}
