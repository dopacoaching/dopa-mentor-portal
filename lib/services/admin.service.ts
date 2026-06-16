import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import TaskLog from '@/models/TaskLog'
import Visit from '@/models/Visit'
import DoubtLog from '@/models/DoubtLog'
import AuditLog from '@/models/AuditLog'

/** Aggregates the admin dashboard snapshot (counts, today's compliance, alerts). */
export async function getDashboard() {
  await connectDB()

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [
    activeMentors,
    activeClassTeachers,
    todayLogs,
    pendingVerifications,
    upcomingVisits,
    doubtLogs,
  ] = await Promise.all([
    User.countDocuments({ role: 'mentor', isActive: { $ne: false } }),
    User.countDocuments({ role: 'class_teacher', isActive: { $ne: false } }),
    TaskLog.find({ date: { $gte: todayStart, $lte: todayEnd } }).populate('mentorId', 'name campus assignedBatches'),
    TaskLog.find({ status: 'submitted', date: { $lt: now } }).populate('mentorId', 'name assignedBatches').sort({ createdAt: 1 }).limit(50),
    Visit.find({ visitDate: { $gte: now, $lte: sevenDaysLater }, status: { $in: ['scheduled', 'confirmed'] } })
      .populate('mentorId', 'name')
      .sort({ visitDate: 1 })
      .limit(10),
    DoubtLog.find({ month, year }),
  ])

  const missedToday = todayLogs
    .filter((log) => {
      const activeTasks = log.tasks.filter((t) => !t.omitted).length
      const completed = log.tasks.filter((t) => t.completed).length
      return completed < activeTasks
    })
    .map((log) => {
      const mentor = log.mentorId as unknown as { name: string; campus: string; assignedBatches: { batchId: string }[] }
      const activeTasks = log.tasks.filter((t) => !t.omitted).length
      return {
        mentorName: mentor?.name ?? 'Unknown',
        campus: mentor?.campus ?? '',
        batchId: log.batchId,
        tasksCompleted: log.tasks.filter((t) => t.completed).length,
        tasksActive: activeTasks,
      }
    })

  const pendingVerificationList = pendingVerifications.map((log) => {
    const mentor = log.mentorId as unknown as { name: string; assignedBatches: { batchId: string }[] }
    const hoursSince = Math.round((now.getTime() - log.createdAt.getTime()) / 3600000)
    return {
      mentorName: mentor?.name ?? 'Unknown',
      date: log.date.toISOString(),
      hoursSince,
      batchId: log.batchId,
    }
  })

  const doubtSummary = doubtLogs.reduce(
    (acc, log) => {
      acc.physics += log.subjects.physics
      acc.chemistry += log.subjects.chemistry
      acc.biology += log.subjects.biology
      acc.mathematics += log.subjects.mathematics
      acc.general += log.subjects.general
      acc.total += log.totalForDay
      return acc
    },
    { physics: 0, chemistry: 0, biology: 0, mathematics: 0, general: 0, total: 0 }
  )

  return {
    activeMentors,
    activeClassTeachers,
    todayTaskCompletion: {
      completed: todayLogs.length,
      total: activeMentors,
    },
    pendingVerifications: pendingVerifications.length,
    missedToday,
    pendingVerificationList: pendingVerificationList.slice(0, 10),
    upcomingVisits: upcomingVisits.map((v) => ({
      visitDate: v.visitDate.toISOString(),
      mentorName: (v.mentorId as unknown as { name: string })?.name ?? 'Unknown',
      campus: v.campus,
      visitType: v.visitType,
    })),
    doubtSummary,
  }
}

/** Paginated, filterable audit log query for admins. */
export async function listAuditLogs(filters: {
  page: number
  limit: number
  action: string | null
  userId: string | null
  userRole: string | null
  search: string | null
  sort: string
}) {
  await connectDB()
  const page = Math.max(1, filters.page)
  const limit = Math.min(100, Math.max(1, filters.limit))

  const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    user: { userName: 1, createdAt: -1 },
    action: { action: 1, createdAt: -1 },
  }
  const sortOrder = SORT_MAP[filters.sort] ?? SORT_MAP.newest

  const query: Record<string, unknown> = {}
  if (filters.action) query.action = filters.action
  if (filters.userId) query.userId = filters.userId
  if (filters.userRole) query.userRole = filters.userRole
  if (filters.search) query.userName = { $regex: filters.search, $options: 'i' }

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort(sortOrder).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ])

  return { logs, total, page, pages: Math.ceil(total / limit) }
}
