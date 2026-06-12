import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, requireAuth, isAuthResult } from '@/lib/middleware'
import TaskLog from '@/models/TaskLog'
import User from '@/models/User'
import { TASK_KEYS, TASK_NAMES } from '@/types'
import { getDayStart, getDayEnd } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const query: Record<string, unknown> = {}

  if (user.role === 'mentor') {
    query.mentorId = user.userId
  } else if (user.role === 'class_teacher') {
    const me = await User.findById(user.userId).select('assignedMentors campus').lean()
    if (me?.assignedMentors?.length) {
      // Explicit assignment takes priority
      query.mentorId = { $in: me.assignedMentors }
    } else if (me?.campus) {
      // Fall back to campus-based: all mentors at the same campus
      const campusMentors = await User.find({ role: 'mentor', campus: me.campus, isActive: true }).select('_id').lean()
      query.mentorId = { $in: campusMentors.map((m) => m._id) }
    } else {
      query.mentorId = { $in: [] }
    }
  }
  // admin / regional_head: no mentorId filter (see all, or handle via separate endpoints)

  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
    query.date = { $gte: start, $lte: end }
  }

  const logs = await TaskLog.find(query)
    .populate('mentorId', 'name username')
    .sort({ date: -1 })
    .limit(200)

  return NextResponse.json({ logs })
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['mentor'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const body = await request.json()
  const { batchId, tasks } = body

  const todayStart = getDayStart(new Date())
  const todayEnd = getDayEnd(new Date())

  const existing = await TaskLog.findOne({
    mentorId: user.userId,
    date: { $gte: todayStart, $lte: todayEnd },
  })

  // Allow resubmission if flagged (mentor correcting their tasks).
  // Verified and auto_closed logs cannot be changed.
  if (existing && (existing.status === 'verified' || existing.status === 'auto_closed')) {
    return NextResponse.json({ error: 'Task log already finalized for today' }, { status: 409 })
  }

  // Reset status to submitted when mentor updates a flagged log
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
    note: null,
    completedAt: null,
  }))

  const mergedTasks = defaultTasks.map((dt) => {
    const override = tasks?.find((t: { taskKey: string }) => t.taskKey === dt.taskKey)
    if (override) {
      return {
        ...dt,
        completed: override.completed ?? false,
        note: override.note ?? null,
        completedAt: override.completed ? new Date() : null,
      }
    }
    return dt
  })

  if (existing) {
    existing.tasks = mergedTasks
    existing.batchId = batchId || existing.batchId
    await existing.save()
    return NextResponse.json({ log: existing })
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
  logAudit({ user, action: 'task.submit', targetType: 'TaskLog', targetId: log._id.toString(), details: { batchId: resolvedBatchId, completed }, request })

  return NextResponse.json({ log }, { status: 201 })
}
