import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import User from '@/models/User'
import TaskLog from '@/models/TaskLog'
import DoubtLog from '@/models/DoubtLog'
import Visit from '@/models/Visit'
import CTVisitReview from '@/models/CTVisitReview'
import { getMonthRange } from '@/lib/utils'
import { calculateMentorPayment } from '@/lib/payment-calculator'

export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { searchParams } = new URL(request.url)
  const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())
  const mentorId = searchParams.get('mentorId')
  const campus = searchParams.get('campus')
  const { start, end } = getMonthRange(month, year)

  let data: unknown = {}

  switch (params.type) {
    case 'mentor-performance': {
      if (!mentorId) return NextResponse.json({ error: 'mentorId required' }, { status: 400 })
      const [mentor, tasks, doubts, visits] = await Promise.all([
        User.findById(mentorId).select('-password'),
        TaskLog.find({ mentorId, date: { $gte: start, $lte: end } }),
        DoubtLog.find({ mentorId, month, year }),
        Visit.find({ mentorId, month, year }),
      ])
      data = { mentor, tasks, doubts, visits, month, year }
      break
    }
    case 'batch-compliance': {
      const mentorQuery: Record<string, unknown> = { role: 'mentor', isActive: true }
      if (campus) mentorQuery.campus = campus
      const mentors = await User.find(mentorQuery).select('-password')
      const taskData = await Promise.all(mentors.map(async (m) => {
        const logs = await TaskLog.find({ mentorId: m._id, date: { $gte: start, $lte: end } })
        const verified = logs.filter((l) => l.status === 'verified').length
        return { mentor: m, totalLogs: logs.length, verifiedLogs: verified, compliancePct: logs.length > 0 ? Math.round((verified / logs.length) * 100) : 0 }
      }))
      data = { mentors: taskData, campus, month, year }
      break
    }
    case 'payment-summary': {
      const mentors = await User.find({ role: 'mentor', isActive: true }).select('name assignedBatches')
      const payments = await Promise.all(mentors.map(async (m) => {
        const [tasks, doubts, visits] = await Promise.all([
          TaskLog.find({ mentorId: m._id, date: { $gte: start, $lte: end } }),
          DoubtLog.find({ mentorId: m._id, month, year }),
          Visit.find({ mentorId: m._id, month, year }),
        ])
        const mentorType = m.assignedBatches?.[0]?.batchType === 'online' ? 'online' : 'offline'
        return calculateMentorPayment({ mentorId: m._id.toString(), mentorName: m.name, mentorType, month, year, taskLogs: tasks, doubtLogs: doubts, visits, meetingAttended: false })
      }))
      data = { payments, month, year }
      break
    }
    case 'visit-log': {
      const visitQuery: Record<string, unknown> = { month, year }
      if (campus) visitQuery.campus = campus
      const visits = await Visit.find(visitQuery).populate('mentorId', 'name').populate('classTeacherId', 'name')
      data = { visits, campus, month, year }
      break
    }
    case 'ct-reviews': {
      const reviewQuery: Record<string, unknown> = {}
      if (mentorId) reviewQuery.mentorId = mentorId
      const reviews = await CTVisitReview.find(reviewQuery)
        .populate('mentorId', 'name campus')
        .populate('classTeacherId', 'name')
        .sort({ visitDate: -1 })
      data = { reviews, month, year }
      break
    }
    default:
      return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  }

  return NextResponse.json({ type: params.type, data, generatedAt: new Date().toISOString() })
}
