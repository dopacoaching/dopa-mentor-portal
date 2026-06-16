import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import TaskLog from '@/models/TaskLog'
import DoubtLog from '@/models/DoubtLog'
import Visit from '@/models/Visit'
import CTVisitReview from '@/models/CTVisitReview'
import { getMonthRange } from '@/lib/utils'
import { calculateMentorPayment } from '@/lib/payment-calculator'
import { ApiError } from '@/lib/api/errors'

export interface ReportFilters {
  month: number
  year: number
  mentorId: string | null
  campus: string | null
}

/** Builds an admin report payload for the given report type. */
export async function generateReport(type: string, filters: ReportFilters): Promise<unknown> {
  await connectDB()
  const { month, year, mentorId, campus } = filters
  const { start, end } = getMonthRange(month, year)

  switch (type) {
    case 'mentor-performance': {
      if (!mentorId) throw ApiError.badRequest('mentorId required')
      const [mentor, tasks, doubts, visits] = await Promise.all([
        User.findById(mentorId).select('-password'),
        TaskLog.find({ mentorId, date: { $gte: start, $lte: end } }),
        DoubtLog.find({ mentorId, month, year }),
        Visit.find({ mentorId, month, year }),
      ])
      return { mentor, tasks, doubts, visits, month, year }
    }
    case 'batch-compliance': {
      const mentorQuery: Record<string, unknown> = { role: 'mentor', isActive: { $ne: false } }
      if (campus) mentorQuery.campus = campus
      const mentors = await User.find(mentorQuery).select('-password')
      const mentorIds = mentors.map((m) => m._id)
      const allLogs = await TaskLog.find({ mentorId: { $in: mentorIds }, date: { $gte: start, $lte: end } }).lean()
      const taskData = mentors.map((m) => {
        const id = m._id.toString()
        const logs = allLogs.filter((l) => l.mentorId.toString() === id)
        const verified = logs.filter((l) => l.status === 'verified').length
        return { mentor: m, totalLogs: logs.length, verifiedLogs: verified, compliancePct: logs.length > 0 ? Math.round((verified / logs.length) * 100) : 0 }
      })
      return { mentors: taskData, campus, month, year }
    }
    case 'payment-summary': {
      const mentors = await User.find({ role: 'mentor', isActive: { $ne: false } }).select('name assignedBatches')
      const mentorIds = mentors.map((m) => m._id)
      const [allTasks, allDoubts, allVisits] = await Promise.all([
        TaskLog.find({ mentorId: { $in: mentorIds }, date: { $gte: start, $lte: end } }).lean(),
        DoubtLog.find({ mentorId: { $in: mentorIds }, month, year }).lean(),
        Visit.find({ mentorId: { $in: mentorIds }, month, year }).lean(),
      ])
      const payments = mentors.map((m) => {
        const id = m._id.toString()
        const tasks = allTasks.filter((t) => t.mentorId.toString() === id)
        const doubts = allDoubts.filter((d) => d.mentorId.toString() === id)
        const visits = allVisits.filter((v) => v.mentorId.toString() === id)
        const mentorType = m.assignedBatches?.[0]?.batchType === 'online' ? 'online' : 'offline'
        return calculateMentorPayment({ mentorId: id, mentorName: m.name, mentorType, month, year, taskLogs: tasks as never, doubtLogs: doubts as never, visits: visits as never, meetingAttended: false })
      })
      return { payments, month, year }
    }
    case 'visit-log': {
      const visitQuery: Record<string, unknown> = { month, year }
      if (campus) visitQuery.campus = campus
      const visits = await Visit.find(visitQuery).populate('mentorId', 'name').populate('classTeacherId', 'name')
      return { visits, campus, month, year }
    }
    case 'ct-reviews': {
      const reviewQuery: Record<string, unknown> = { visitDate: { $gte: start, $lte: end } }
      if (mentorId) reviewQuery.mentorId = mentorId
      const reviews = await CTVisitReview.find(reviewQuery)
        .populate('mentorId', 'name campus')
        .populate('classTeacherId', 'name')
        .sort({ visitDate: -1 })
      return { reviews, month, year }
    }
    default:
      throw ApiError.badRequest('Unknown report type')
  }
}
