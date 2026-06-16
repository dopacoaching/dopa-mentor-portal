import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import TaskLog from '@/models/TaskLog'
import Notification from '@/models/Notification'
import { sendToUser, sendToRole } from '@/lib/sse'

/** Auto-closes today's still-submitted logs that have incomplete tasks. */
export async function autoCloseTasks() {
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

      const mentorNotif = await Notification.create({
        recipientId: mentor._id,
        type: 'task_missed',
        message: `You missed completing all tasks on ${now.toDateString()}. Your log has been auto-closed.`,
        relatedId: log._id,
      })
      sendToUser(mentor._id.toString(), { type: 'notification', data: mentorNotif.toObject() })

      const alertMsg = `${mentor.name} missed tasks on ${now.toDateString()}. Log auto-closed.`
      sendToRole('class_teacher', { type: 'notification', data: { type: 'task_missed', message: alertMsg } })
      sendToRole('admin', { type: 'notification', data: { type: 'task_missed', message: alertMsg } })
    }
  }

  return { processed: pendingLogs.length, closed }
}

/** Flags mentors who missed 3+ of the last 4 days; notifies admins (deduped 24h). */
export async function checkConsecutiveMisses() {
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
      const alreadyNotified = await Notification.findOne({
        type: 'consecutive_miss',
        relatedId: mentor._id,
        createdAt: { $gte: new Date(now.getTime() - 86400000) },
      })
      if (!alreadyNotified) {
        const msg = `${mentor.name} has missed tasks for ${misses.length} consecutive days.`

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

  return { checked: mentors.length, flagged }
}

/** Alerts admins about submitted task logs left unverified for 24h+. */
export async function checkUnverifiedTasks() {
  await connectDB()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const stale = await TaskLog.find({ status: 'submitted', createdAt: { $lt: cutoff } })
    .populate('mentorId', 'name')

  if (stale.length > 0) {
    const msg = `${stale.length} task submission${stale.length > 1 ? 's have' : ' has'} been unverified for more than 24 hours.`

    sendToRole('admin', { type: 'notification', data: { message: msg, type: 'unverified_tasks' } })

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

  return { staleCount: stale.length }
}
