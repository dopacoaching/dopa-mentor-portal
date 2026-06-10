import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, requireAuth, isAuthResult } from '@/lib/middleware'
import TaskLog from '@/models/TaskLog'
import User from '@/models/User'
import { TASK_KEYS, TASK_NAMES } from '@/types'
import { getDayStart, getDayEnd } from '@/lib/utils'

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
    const me = await User.findById(user.userId).select('assignedMentors campus')
    query.mentorId = { $in: me?.assignedMentors ?? [] }
  }

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

  if (existing && existing.status !== 'submitted') {
    return NextResponse.json({ error: 'Task log already finalized for today' }, { status: 409 })
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

  return NextResponse.json({ log }, { status: 201 })
}
