import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import TaskLog from '@/models/TaskLog'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { TASK_KEYS, TASK_NAMES } from '@/types'
import { getDayStart, getDayEnd } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import { ApiError } from '@/lib/api/errors'
import { assertCanAccessMentor } from '@/lib/services/access.service'
import type { JWTPayload } from '@/types'

/** Task logs visible to the current user, optionally scoped to a month. */
export async function listTaskLogs(user: JWTPayload, month: string | null, year: string | null) {
  await connectDB()
  const query: Record<string, unknown> = {}

  if (user.role === 'mentor') {
    query.mentorId = user.userId
  } else if (user.role === 'class_teacher') {
    const me = await User.findById(user.userId).select('assignedMentors campus').lean()
    if (me?.assignedMentors?.length) {
      query.mentorId = { $in: me.assignedMentors }
    } else if (me?.campus) {
      const campusMentors = await User.find({ role: 'mentor', campus: me.campus, isActive: { $ne: false } }).select('_id').lean()
      query.mentorId = { $in: campusMentors.map((m) => m._id) }
    } else {
      query.mentorId = { $in: [] }
    }
  }
  // admin / regional_head: no mentorId filter

  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
    query.date = { $gte: start, $lte: end }
  }

  return TaskLog.find(query).populate('mentorId', 'name username').sort({ date: -1 }).limit(200)
}

/** Task logs for a specific mentor (mentors may only view their own). */
export async function listTaskLogsByMentor(
  requester: JWTPayload,
  mentorId: string,
  month: string | null,
  year: string | null
) {
  await assertCanAccessMentor(requester, mentorId)
  await connectDB()
  const query: Record<string, unknown> = { mentorId }
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
    query.date = { $gte: start, $lte: end }
  }
  return TaskLog.find(query).sort({ date: -1 })
}

interface TaskOverride {
  taskKey: string
  completed?: boolean
  omitted?: boolean
  note?: string | null
}

/** Submits or updates today's task log for a mentor. */
export async function submitTaskLog(
  user: JWTPayload,
  body: { batchId?: string; tasks?: TaskOverride[] },
  request?: NextRequest
) {
  await connectDB()
  const { batchId, tasks } = body

  const todayStart = getDayStart(new Date())
  const todayEnd = getDayEnd(new Date())

  const existing = await TaskLog.findOne({
    mentorId: user.userId,
    date: { $gte: todayStart, $lte: todayEnd },
  })

  if (existing && (existing.status === 'verified' || existing.status === 'auto_closed')) {
    throw ApiError.conflict('Task log already finalized for today')
  }

  if (existing && existing.status === 'flagged') {
    existing.status = 'submitted'
    existing.verificationNote = null
    existing.verifiedBy = null
    existing.verifiedAt = null
  }

  const defaultTasks = TASK_KEYS.map((key) => ({
    taskKey: key,
    taskName: TASK_NAMES[key],
    completed: false,
    omitted: false,
    note: null as string | null,
    completedAt: null as Date | null,
  }))

  const mergedTasks = defaultTasks.map((dt) => {
    const override = tasks?.find((t) => t.taskKey === dt.taskKey)
    if (override) {
      const omitted = override.omitted ?? false
      return {
        ...dt,
        completed: omitted ? false : (override.completed ?? false),
        omitted,
        note: override.note ?? null,
        completedAt: !omitted && override.completed ? new Date() : null,
      }
    }
    return dt
  })

  if (existing) {
    existing.tasks = mergedTasks
    existing.batchId = batchId || existing.batchId
    await existing.save()
    return { log: existing, created: false }
  }

  const mentor = await User.findById(user.userId).select('assignedBatches')
  const resolvedBatchId = batchId || mentor?.assignedBatches?.[0]?.batchId || 'default'

  const log = await TaskLog.create({
    mentorId: user.userId,
    date: todayStart,
    batchId: resolvedBatchId,
    tasks: mergedTasks,
    status: 'submitted',
  })

  const completed = mergedTasks.filter((t) => t.completed).length
  const omitted = mergedTasks.filter((t) => t.omitted).length
  logAudit({ user, action: 'task.submit', targetType: 'TaskLog', targetId: log._id.toString(), details: { batchId: resolvedBatchId, completed, omitted }, request })

  return { log, created: true }
}

/** Class teacher / admin verifies or flags a mentor's task log. */
export async function verifyTaskLog(
  user: JWTPayload,
  body: { logId?: string; action?: string; note?: string },
  request?: NextRequest
) {
  await connectDB()
  const { logId, action, note } = body

  if (!logId || !action || !['verified', 'flagged'].includes(action)) {
    throw ApiError.badRequest('logId and action (verified|flagged) required')
  }

  const log = await TaskLog.findById(logId)
  if (!log) throw ApiError.notFound('Task log not found')

  // Class teachers may only verify mentors assigned to them or in their campus.
  await assertCanAccessMentor(user, log.mentorId.toString())

  log.status = action as 'verified' | 'flagged'
  log.verifiedBy = new mongoose.Types.ObjectId(user.userId)
  log.verificationNote = note || null
  log.verifiedAt = new Date()
  await log.save()

  logAudit({ user, action: `task.${action}`, targetType: 'TaskLog', targetId: logId, details: { note: note || null, mentorId: log.mentorId.toString() }, request })

  if (action === 'flagged') {
    await Notification.create({
      recipientId: log.mentorId,
      type: 'task_flagged',
      message: `Your task log for ${log.date.toDateString()} was flagged${note ? `: ${note}` : '.'}`,
      relatedId: log._id,
    })
  }

  return log
}
