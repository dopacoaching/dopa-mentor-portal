import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import User from '@/models/User'
import TaskLog from '@/models/TaskLog'
import Visit from '@/models/Visit'
import DoubtLog from '@/models/DoubtLog'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

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
    mentorCount,
    pendingVerifications,
    upcomingVisits,
    doubtLogs,
  ] = await Promise.all([
    User.countDocuments({ role: 'mentor', isActive: true }),
    User.countDocuments({ role: 'class_teacher', isActive: true }),
    TaskLog.find({ date: { $gte: todayStart, $lte: todayEnd } }).populate('mentorId', 'name campus assignedBatches'),
    User.countDocuments({ role: 'mentor', isActive: true }),
    TaskLog.find({ status: 'submitted', date: { $lt: now } }).populate('mentorId', 'name assignedBatches').sort({ createdAt: 1 }),
    Visit.find({ visitDate: { $gte: now, $lte: sevenDaysLater }, status: { $in: ['scheduled', 'confirmed'] } })
      .populate('mentorId', 'name')
      .sort({ visitDate: 1 })
      .limit(10),
    DoubtLog.find({ month, year }),
  ])

  const missedToday = todayLogs
    .filter((log) => {
      const completed = log.tasks.filter((t) => t.completed).length
      return completed < 9
    })
    .map((log) => {
      const mentor = log.mentorId as unknown as { name: string; campus: string; assignedBatches: { batchId: string }[] }
      return {
        mentorName: mentor?.name ?? 'Unknown',
        campus: mentor?.campus ?? '',
        batchId: log.batchId,
        tasksCompleted: log.tasks.filter((t) => t.completed).length,
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

  return NextResponse.json({
    activeMentors,
    activeClassTeachers,
    todayTaskCompletion: {
      completed: todayLogs.length,
      total: mentorCount,
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
  })
}
