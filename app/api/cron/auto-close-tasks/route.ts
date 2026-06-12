import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import TaskLog from '@/models/TaskLog'
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
  }).populate('mentorId', 'name')

  let closed = 0
  for (const log of pendingLogs) {
    const hasIncomplete = log.tasks.some((t) => !t.completed && !t.omitted)
    if (hasIncomplete) {
      log.status = 'auto_closed'
      log.autoClosedAt = now
      await log.save()
      closed++

      const mentor = log.mentorId as unknown as { _id: { toString(): string }; name: string }

      // Notify the mentor in second-person
      const mentorNotif = await Notification.create({
        recipientId: mentor._id,
        type: 'task_missed',
        message: `You missed completing all tasks on ${now.toDateString()}. Your log has been auto-closed.`,
        relatedId: log._id,
      })
      sendToUser(mentor._id.toString(), { type: 'notification', data: mentorNotif.toObject() })

      // Broadcast alert to class_teachers and admins via SSE (real-time only, no stored notification)
      const alertMsg = `${mentor.name} missed tasks on ${now.toDateString()}. Log auto-closed.`
      sendToRole('class_teacher', { type: 'notification', data: { type: 'task_missed', message: alertMsg } })
      sendToRole('admin', { type: 'notification', data: { type: 'task_missed', message: alertMsg } })
    }
  }

  return NextResponse.json({ processed: pendingLogs.length, closed })
}
