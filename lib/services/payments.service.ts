import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import TaskLog from '@/models/TaskLog'
import DoubtLog from '@/models/DoubtLog'
import Visit from '@/models/Visit'
import { calculateMentorPayment } from '@/lib/payment-calculator'
import { getMonthRange } from '@/lib/utils'
import { ApiError } from '@/lib/api/errors'
import type { JWTPayload, PaymentBreakdown } from '@/types'

/**
 * Computes payment breakdowns for the given "month-year" period. Admins see all
 * active mentors; a mentor sees only their own. Sorted by total descending.
 */
export async function getMonthlyPayments(
  user: JWTPayload,
  monthParam: string,
  meetingAttended: boolean
): Promise<{ payments: PaymentBreakdown[]; month: number; year: number }> {
  const [monthStr, yearStr] = monthParam.split('-')
  const month = Number(monthStr)
  const year = Number(yearStr) || new Date().getFullYear()

  if (!month || month < 1 || month > 12) {
    throw ApiError.badRequest('Invalid month parameter')
  }

  await connectDB()
  const { start, end } = getMonthRange(month, year)

  const mentorQuery: Record<string, unknown> = { role: 'mentor', isActive: { $ne: false } }
  if (user.role === 'mentor') mentorQuery._id = user.userId

  const mentors = await User.find(mentorQuery).select('name assignedBatches')
  const mentorIds = mentors.map((m) => m._id)

  const [allTaskLogs, allDoubtLogs, allVisits] = await Promise.all([
    TaskLog.find({ mentorId: { $in: mentorIds }, date: { $gte: start, $lte: end } }).lean(),
    DoubtLog.find({ mentorId: { $in: mentorIds }, month, year }).lean(),
    Visit.find({ mentorId: { $in: mentorIds }, month, year }).lean(),
  ])

  const payments = mentors.map((mentor) => {
    const id = mentor._id.toString()
    const taskLogs = allTaskLogs.filter((l) => l.mentorId.toString() === id)
    const doubtLogs = allDoubtLogs.filter((l) => l.mentorId.toString() === id)
    const visits = allVisits.filter((v) => v.mentorId.toString() === id)
    const mentorType = mentor.assignedBatches?.some((b) => b.batchType === 'online') ? 'online' : 'offline'

    return calculateMentorPayment({
      mentorId: id,
      mentorName: mentor.name,
      mentorType,
      month,
      year,
      taskLogs: taskLogs as never,
      doubtLogs: doubtLogs as never,
      visits: visits as never,
      meetingAttended,
    })
  })

  payments.sort((a, b) => b.total - a.total)
  return { payments, month, year }
}
