import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, requireAuth, isAuthResult } from '@/lib/middleware'
import User from '@/models/User'
import TaskLog from '@/models/TaskLog'
import DoubtLog from '@/models/DoubtLog'
import Visit from '@/models/Visit'
import { calculateMentorPayment } from '@/lib/payment-calculator'
import { getMonthRange } from '@/lib/utils'

export async function GET(request: NextRequest, { params }: { params: { month: string } }) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  const { user } = authResult
  if (!['admin', 'mentor'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const { searchParams } = new URL(request.url)
  const [monthStr, yearStr] = params.month.split('-')
  const month = Number(monthStr)
  const year = Number(yearStr) || new Date().getFullYear()
  const meetingAttended = searchParams.get('meetingAttended') === 'true'

  const { start, end } = getMonthRange(month, year)

  const mentorQuery: Record<string, unknown> = { role: 'mentor', isActive: true }
  if (user.role === 'mentor') mentorQuery._id = user.userId

  const mentors = await User.find(mentorQuery).select('name assignedBatches')

  const payments = await Promise.all(mentors.map(async (mentor) => {
    const [taskLogs, doubtLogs, visits] = await Promise.all([
      TaskLog.find({ mentorId: mentor._id, date: { $gte: start, $lte: end } }),
      DoubtLog.find({ mentorId: mentor._id, month, year }),
      Visit.find({ mentorId: mentor._id, month, year }),
    ])

    const mentorType = mentor.assignedBatches?.[0]?.batchType === 'online' ? 'online' : 'offline'

    return calculateMentorPayment({
      mentorId: mentor._id.toString(),
      mentorName: mentor.name,
      mentorType,
      month,
      year,
      taskLogs,
      doubtLogs,
      visits,
      meetingAttended,
    })
  }))

  payments.sort((a, b) => b.total - a.total)
  return NextResponse.json({ payments, month, year })
}
