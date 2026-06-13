import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Visit from '@/models/Visit'
import User from '@/models/User'
import MentorVisitReport from '@/models/MentorVisitReport'
import Notification from '@/models/Notification'
import { sendToUser, sendToRole } from '@/lib/sse'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['mentor'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const body = await request.json()
  const { visitId, numberOfStudentsMet, discussionTopics, directiveCovered, studentObservations, followUpRequired, followUpDetails } = body

  if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })

  const visit = await Visit.findById(visitId)
  if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
  if (visit.mentorId.toString() !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (visit.mentorReportSubmitted) {
    return NextResponse.json({ error: 'Report already submitted' }, { status: 409 })
  }

  // Look up human-readable batch name from mentor's assignedBatches
  const mentor = await User.findById(user.userId).select('assignedBatches').lean()
  const matchedBatch = mentor?.assignedBatches?.find((b) => b.batchId === visit.batchId)
  const batchName = matchedBatch?.batchName ?? visit.batchId

  const report = await MentorVisitReport.create({
    visitId,
    mentorId: user.userId,
    visitDate: visit.visitDate,
    campus: visit.campus,
    batchName,
    visitType: visit.visitType,
    numberOfStudentsMet: numberOfStudentsMet ?? 0,
    discussionTopics: discussionTopics ?? '',
    directiveCovered: directiveCovered ?? false,
    studentObservations: studentObservations ?? '',
    followUpRequired: followUpRequired ?? false,
    followUpDetails: followUpDetails || null,
    submittedAt: new Date(),
  })

  visit.mentorReportSubmitted = true
  visit.status = 'completed'
  if (visit.ctReviewSubmitted) visit.countedForPayment = true
  await visit.save()

  const msg = `Visit report submitted for ${visit.campus} on ${visit.visitDate.toDateString()}.`

  // Notify the class teacher (stored + real-time)
  const ctNotif = await Notification.create({ recipientId: visit.classTeacherId, type: 'visit_report_submitted', message: msg, relatedId: visit._id })
  sendToUser(visit.classTeacherId.toString(), { type: 'notification', data: ctNotif.toObject() })

  // Notify each admin with their own stored notification
  const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').lean()
  await Promise.all(admins.map(async (admin) => {
    const adminNotif = await Notification.create({ recipientId: admin._id, type: 'visit_report_submitted', message: msg, relatedId: visit._id })
    sendToUser(admin._id.toString(), { type: 'notification', data: adminNotif.toObject() })
  }))

  logAudit({ user, action: 'visit.mentor_report', targetType: 'Visit', targetId: visitId, details: { campus: visit.campus, visitDate: visit.visitDate }, request })

  return NextResponse.json({ report }, { status: 201 })
}
