import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Visit from '@/models/Visit'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { sendToUser } from '@/lib/sse'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['mentor'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { visitId, action, reason } = await request.json()

  if (!visitId || !action || !['confirm', 'request_change'].includes(action)) {
    return NextResponse.json({ error: 'visitId and action (confirm|request_change) required' }, { status: 400 })
  }

  const visit = await Visit.findById(visitId)
  if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
  if (visit.mentorId.toString() !== authResult.user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (visit.status !== 'scheduled') {
    return NextResponse.json({ error: 'Visit is not in a confirmable state' }, { status: 409 })
  }

  visit.status = action === 'confirm' ? 'confirmed' : 'change_requested'
  if (action === 'request_change' && reason) visit.mentorChangeReason = reason
  await visit.save()

  const mentor = await User.findById(authResult.user.userId).select('name')
  const mentorName = mentor?.name ?? 'Unknown'
  const message = action === 'confirm'
    ? `${mentorName} confirmed the visit on ${visit.visitDate.toDateString()}.`
    : `${mentorName} requested a change for visit on ${visit.visitDate.toDateString()}${reason ? `: ${reason}` : '.'}`

  const notifType = action === 'confirm' ? 'visit_confirmed' : 'visit_change_requested'

  // Notify the class teacher (stored + real-time)
  const ctNotif = await Notification.create({
    recipientId: visit.classTeacherId,
    type: notifType,
    message,
    relatedId: visit._id,
  })
  sendToUser(visit.classTeacherId.toString(), { type: 'notification', data: ctNotif.toObject() })

  // Notify each admin with their own stored notification
  const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').lean()
  await Promise.all(admins.map(async (admin) => {
    const adminNotif = await Notification.create({ recipientId: admin._id, type: notifType, message, relatedId: visit._id })
    sendToUser(admin._id.toString(), { type: 'notification', data: adminNotif.toObject() })
  }))

  logAudit({ user: authResult.user, action: `visit.${action}`, targetType: 'Visit', targetId: visitId, details: { reason: reason || null }, request })

  return NextResponse.json({ visit })
}
