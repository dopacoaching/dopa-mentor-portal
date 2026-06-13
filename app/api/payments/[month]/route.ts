import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, isAuthResult } from '@/lib/middleware'
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

  if (!month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid month parameter' }, { status: 400 })
  }

  const { start, end } = getMonthRange(month, year)

  const mentorQuery: Record<string, unknown> = { role: 'mentor', isActive: { $ne: false } }
  if (user.role === 'mentor') mentorQuery._id = user.userId

  const mentors = await User.find(mentorQuery).select('name assignedBatches')
  const mentorIds = mentors.map((m) => m._id)

  // Batch-fetch all data in 3 queries instead of 3×N
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
  return NextResponse.json({ payments, month, year })
}
