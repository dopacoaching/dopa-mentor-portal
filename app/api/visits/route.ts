import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, requireRole, isAuthResult } from '@/lib/middleware'
import Visit from '@/models/Visit'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { sendToUser } from '@/lib/sse'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const mentorId = searchParams.get('mentorId')

  const query: Record<string, unknown> = {}

  if (user.role === 'mentor') {
    query.mentorId = user.userId
  } else if (user.role === 'class_teacher') {
    query.classTeacherId = user.userId
  }

  if (mentorId && user.role !== 'mentor') query.mentorId = mentorId
  if (month) query.month = Number(month)
  if (year) query.year = Number(year)

  const visits = await Visit.find(query)
    .populate('mentorId', 'name username campus')
    .populate('classTeacherId', 'name')
    .sort({ visitDate: -1 })

  return NextResponse.json({ visits })
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['class_teacher', 'admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json()
  const { mentorId, visitDate, visitType, batchId } = body

  if (!mentorId || !visitDate || !visitType) {
    return NextResponse.json({ error: 'mentorId, visitDate, visitType required' }, { status: 400 })
  }

  const mentor = await User.findById(mentorId).select('campus assignedBatches')
  if (!mentor) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })

  const date = new Date(visitDate)
  const visit = await Visit.create({
    mentorId,
    classTeacherId: authResult.user.userId,
    campus: mentor.campus || body.campus || 'Unknown',
    batchId: batchId || mentor.assignedBatches?.[0]?.batchId || 'default',
    visitDate: date,
    visitType,
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    status: 'scheduled',
    mentorReportSubmitted: false,
    ctReviewSubmitted: false,
    countedForPayment: false,
  })

  const notification = await Notification.create({
    recipientId: mentorId,
    type: 'visit_scheduled',
    message: `A campus visit has been scheduled for ${date.toDateString()} at ${mentor.campus || 'your campus'}.`,
    relatedId: visit._id,
  })
  sendToUser(mentorId, { type: 'notification', data: notification.toObject() })

  return NextResponse.json({ visit }, { status: 201 })
}
