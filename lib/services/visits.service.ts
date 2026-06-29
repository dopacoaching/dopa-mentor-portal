import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Visit from '@/models/Visit'
import User from '@/models/User'
import CTVisitReview from '@/models/CTVisitReview'
import MentorVisitReport from '@/models/MentorVisitReport'
import Notification from '@/models/Notification'
import { logAudit } from '@/lib/audit'
import { ApiError } from '@/lib/api/errors'
import type { JWTPayload } from '@/types'

/** Visits visible to the current user, scoped by role. */
export async function listVisits(
  user: JWTPayload,
  filters: { month: string | null; year: string | null; mentorId: string | null }
) {
  await connectDB()
  const { month, year, mentorId } = filters
  const query: Record<string, unknown> = {}

  if (user.role === 'mentor') {
    query.mentorId = user.userId
  } else if (user.role === 'class_teacher') {
    query.classTeacherId = user.userId
  } else if (user.role === 'regional_head') {
    const me = await User.findById(user.userId).select('region').lean()
    if (me?.region) {
      const regionCTs = await User.find({ role: 'class_teacher', region: me.region }).select('_id').lean()
      query.classTeacherId = { $in: regionCTs.map((ct) => ct._id) }
    }
  }

  if (mentorId && user.role !== 'mentor') query.mentorId = mentorId
  if (month) query.month = Number(month)
  if (year) query.year = Number(year)

  return Visit.find(query)
    .populate('mentorId', 'name username campus')
    .populate('classTeacherId', 'name')
    .sort({ visitDate: -1 })
}

/** Schedules a new visit (class teacher / admin) and notifies the mentor. */
export async function scheduleVisit(
  user: JWTPayload,
  body: { mentorId?: string; visitDate?: string; visitType?: string; batchId?: string; ctRemark?: string; campus?: string },
  request?: NextRequest
) {
  await connectDB()
  const { mentorId, visitDate, visitType, batchId, ctRemark } = body

  if (!mentorId || !visitDate || !visitType) {
    throw ApiError.badRequest('mentorId, visitDate, visitType required')
  }

  const mentor = await User.findById(mentorId).select('campus assignedBatches role')
  if (!mentor || mentor.role !== 'mentor') throw ApiError.notFound('Mentor not found')

  const date = new Date(visitDate)
  const visit = await Visit.create({
    mentorId,
    classTeacherId: user.userId,
    campus: mentor.campus || body.campus || 'Unknown',
    batchId: batchId || mentor.assignedBatches?.[0]?.batchId || 'default',
    visitDate: date,
    visitType,
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    status: 'scheduled',
    ctRemark: ctRemark || null,
    mentorReportSubmitted: false,
    ctReviewSubmitted: false,
    countedForPayment: false,
  })

  await Notification.create({
    recipientId: mentorId,
    type: 'visit_scheduled',
    message: `A campus visit has been scheduled for ${date.toDateString()} at ${mentor.campus || 'your campus'}.`,
    relatedId: visit._id,
  })

  logAudit({ user, action: 'visit.schedule', targetType: 'Visit', targetId: visit._id.toString(), details: { mentorId, visitDate, visitType, campus: visit.campus }, request })

  return visit
}

/** Single visit with ownership check for mentors. */
export async function getVisit(user: JWTPayload, id: string) {
  await connectDB()
  const visit = await Visit.findById(id)
    .populate('mentorId', 'name username campus')
    .populate('classTeacherId', 'name')

  if (!visit) throw ApiError.notFound('Visit not found')
  if (user.role === 'mentor' && visit.mentorId._id.toString() !== user.userId) {
    throw ApiError.forbidden()
  }
  return visit
}

const ADMIN_FIELDS = ['visitDate', 'visitType', 'batchId', 'campus', 'status', 'ctRemark', 'mentorReportSubmitted', 'ctReviewSubmitted', 'countedForPayment']
const CT_FIELDS = ['visitDate', 'visitType', 'batchId', 'ctRemark', 'status']
const MENTOR_FIELDS = ['mentorChangeReason']

/** Updates a visit with per-role field allow-lists and ownership checks. */
export async function updateVisit(
  user: JWTPayload,
  id: string,
  body: Record<string, unknown>,
  request?: NextRequest
) {
  await connectDB()
  const visit = await Visit.findById(id)
  if (!visit) throw ApiError.notFound('Visit not found')

  if (user.role === 'mentor' && visit.mentorId.toString() !== user.userId) {
    throw ApiError.forbidden()
  }
  if (user.role === 'class_teacher' && visit.classTeacherId.toString() !== user.userId) {
    throw ApiError.forbidden()
  }

  const allowed =
    user.role === 'admin' ? ADMIN_FIELDS :
    user.role === 'class_teacher' ? CT_FIELDS :
    MENTOR_FIELDS

  const safe = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  Object.assign(visit, safe)
  await visit.save()

  logAudit({ user, action: 'visit.update', targetType: 'Visit', targetId: id, details: { changed: Object.keys(safe) }, request })

  return visit
}

/** Mentor confirms or requests a change to a scheduled visit; notifies CT + admins. */
export async function respondToVisit(
  user: JWTPayload,
  body: { visitId?: string; action?: string; reason?: string },
  request?: NextRequest
) {
  await connectDB()
  const { visitId, action, reason } = body

  if (!visitId || !action || !['confirm', 'request_change'].includes(action)) {
    throw ApiError.badRequest('visitId and action (confirm|request_change) required')
  }

  const visit = await Visit.findById(visitId)
  if (!visit) throw ApiError.notFound('Visit not found')
  if (visit.mentorId.toString() !== user.userId) throw ApiError.forbidden()
  if (visit.status !== 'scheduled') throw ApiError.conflict('Visit is not in a confirmable state')

  visit.status = action === 'confirm' ? 'confirmed' : 'change_requested'
  if (action === 'request_change' && reason) visit.mentorChangeReason = reason
  await visit.save()

  const mentor = await User.findById(user.userId).select('name')
  const mentorName = mentor?.name ?? 'Unknown'
  const message = action === 'confirm'
    ? `${mentorName} confirmed the visit on ${visit.visitDate.toDateString()}.`
    : `${mentorName} requested a change for visit on ${visit.visitDate.toDateString()}${reason ? `: ${reason}` : '.'}`

  const notifType = action === 'confirm' ? 'visit_confirmed' : 'visit_change_requested'

  await Notification.create({
    recipientId: visit.classTeacherId,
    type: notifType,
    message,
    relatedId: visit._id,
  })

  const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').lean()
  await Promise.all(admins.map((admin) =>
    Notification.create({ recipientId: admin._id, type: notifType, message, relatedId: visit._id })
  ))

  logAudit({ user, action: `visit.${action}`, targetType: 'Visit', targetId: visitId, details: { reason: reason || null }, request })

  return visit
}

/** Lists CT visit reviews visible to the requester, scoped by role and filters. */
export async function listCtReviews(
  user: JWTPayload,
  filters: { visitId: string | null; mentorId: string | null; month: string | null; year: string | null }
) {
  await connectDB()
  const { visitId, mentorId, month, year } = filters
  const query: Record<string, unknown> = {}
  if (visitId) query.visitId = visitId
  if (mentorId) query.mentorId = mentorId

  if (user.role === 'class_teacher') {
    query.classTeacherId = user.userId
  } else if (user.role === 'regional_head') {
    const me = await User.findById(user.userId).select('region').lean()
    if (me?.region) {
      const regionCTs = await User.find({ role: 'class_teacher', region: me.region }).select('_id').lean()
      query.classTeacherId = { $in: regionCTs.map((ct) => ct._id) }
    }
  }

  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
    query.visitDate = { $gte: start, $lte: end }
  }

  return CTVisitReview.find(query)
    .populate('mentorId', 'name campus')
    .populate('classTeacherId', 'name')
    .sort({ createdAt: -1 })
}

/** Class teacher / admin submits a visit review; may count the visit for payment. */
export async function createCtReview(
  user: JWTPayload,
  body: Record<string, unknown>,
  request?: NextRequest
) {
  await connectDB()
  const { visitId, wasPunctual, interactionQuality, interactionComments, directiveCovered, overallEffectiveness, observations, recommendedAction } = body as {
    visitId?: string
    wasPunctual?: boolean
    interactionQuality?: number
    interactionComments?: string
    directiveCovered?: string
    overallEffectiveness?: number
    observations?: string
    recommendedAction?: string
  }

  if (!visitId) throw ApiError.badRequest('visitId required')

  const visit = await Visit.findById(visitId)
  if (!visit) throw ApiError.notFound('Visit not found')

  if (user.role === 'class_teacher' && visit.classTeacherId.toString() !== user.userId) {
    throw ApiError.forbidden()
  }

  const existing = await CTVisitReview.findOne({ visitId })
  if (existing) throw ApiError.conflict('Review already submitted')

  const review = await CTVisitReview.create({
    visitId,
    classTeacherId: user.userId,
    mentorId: visit.mentorId,
    visitDate: visit.visitDate,
    wasPunctual: wasPunctual ?? true,
    interactionQuality: interactionQuality ?? 3,
    interactionComments: interactionComments ?? '',
    directiveCovered: directiveCovered ?? 'yes',
    overallEffectiveness: overallEffectiveness ?? 3,
    observations: observations ?? '',
    recommendedAction: recommendedAction ?? 'none',
    submittedAt: new Date(),
  })

  visit.ctReviewSubmitted = true
  if (visit.mentorReportSubmitted && visit.status === 'completed') {
    visit.countedForPayment = true
  }
  await visit.save()

  logAudit({ user, action: 'visit.ct_review', targetType: 'Visit', targetId: visitId, details: { mentorId: visit.mentorId.toString(), overallEffectiveness }, request })

  return review
}

/** Mentor submits a post-visit report; marks visit completed and notifies CT + admins. */
export async function submitMentorReport(
  user: JWTPayload,
  body: Record<string, unknown>,
  request?: NextRequest
) {
  await connectDB()
  const { visitId, numberOfStudentsMet, discussionTopics, directiveCovered, studentObservations, followUpRequired, followUpDetails } = body as {
    visitId?: string
    numberOfStudentsMet?: number
    discussionTopics?: string
    directiveCovered?: boolean
    studentObservations?: string
    followUpRequired?: boolean
    followUpDetails?: string
  }

  if (!visitId) throw ApiError.badRequest('visitId required')

  const visit = await Visit.findById(visitId)
  if (!visit) throw ApiError.notFound('Visit not found')
  if (visit.mentorId.toString() !== user.userId) throw ApiError.forbidden()
  if (visit.mentorReportSubmitted) throw ApiError.conflict('Report already submitted')

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

  await Notification.create({ recipientId: visit.classTeacherId, type: 'visit_report_submitted', message: msg, relatedId: visit._id })

  const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').lean()
  await Promise.all(admins.map((admin) =>
    Notification.create({ recipientId: admin._id, type: 'visit_report_submitted', message: msg, relatedId: visit._id })
  ))

  logAudit({ user, action: 'visit.mentor_report', targetType: 'Visit', targetId: visitId, details: { campus: visit.campus, visitDate: visit.visitDate }, request })

  return report
}
