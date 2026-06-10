import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Visit from '@/models/Visit'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { sendToUser, sendToRole } from '@/lib/sse'

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

  visit.status = action === 'confirm' ? 'confirmed' : 'change_requested'
  if (action === 'request_change' && reason) visit.mentorChangeReason = reason
  await visit.save()

  const mentor = await User.findById(authResult.user.userId).select('name')
  const message = action === 'confirm'
    ? `${mentor?.name} confirmed the visit on ${visit.visitDate.toDateString()}.`
    : `${mentor?.name} requested a change for visit on ${visit.visitDate.toDateString()}${reason ? `: ${reason}` : '.'}`

  const ctNotif = await Notification.create({
    recipientId: visit.classTeacherId,
    type: action === 'confirm' ? 'visit_confirmed' : 'visit_change_requested',
    message,
    relatedId: visit._id,
  })
  sendToUser(visit.classTeacherId.toString(), { type: 'notification', data: ctNotif.toObject() })
  sendToRole('admin', { type: 'notification', data: ctNotif.toObject() })

  return NextResponse.json({ visit })
}
