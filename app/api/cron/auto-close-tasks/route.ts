import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import TaskLog from '@/models/TaskLog'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { sendToUser, sendToRole } from '@/lib/sse'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  const pendingLogs = await TaskLog.find({
    date: { $gte: todayStart, $lte: todayEnd },
    status: 'submitted',
  }).populate('mentorId', 'name assignedMentors')

  let closed = 0
  for (const log of pendingLogs) {
    const hasIncomplete = log.tasks.some((t) => !t.completed)
    if (hasIncomplete) {
      log.status = 'auto_closed'
      log.autoClosedAt = now
      await log.save()
      closed++

      const mentorId = log.mentorId._id?.toString() ?? log.mentorId.toString()
      const mentor = log.mentorId as unknown as { name: string }

      const msg = `${mentor.name ?? 'A mentor'} missed tasks on ${now.toDateString()}. Log auto-closed.`
      const ctNotif = await Notification.create({
        recipientId: log.mentorId,
        type: 'task_missed',
        message: msg,
        relatedId: log._id,
      })
      sendToRole('class_teacher', { type: 'notification', data: ctNotif.toObject() })
      sendToRole('admin', { type: 'notification', data: ctNotif.toObject() })
    }
  }

  return NextResponse.json({ processed: pendingLogs.length, closed })
}
