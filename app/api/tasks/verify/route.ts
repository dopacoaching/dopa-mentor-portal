import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import TaskLog from '@/models/TaskLog'
import Notification from '@/models/Notification'
import { sendToUser } from '@/lib/sse'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['class_teacher', 'admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { logId, action, note } = await request.json()

  if (!logId || !action || !['verified', 'flagged'].includes(action)) {
    return NextResponse.json({ error: 'logId and action (verified|flagged) required' }, { status: 400 })
  }

  const log = await TaskLog.findById(logId)
  if (!log) return NextResponse.json({ error: 'Task log not found' }, { status: 404 })

  log.status = action
  log.verifiedBy = new mongoose.Types.ObjectId(authResult.user.userId)
  log.verificationNote = note || null
  log.verifiedAt = new Date()
  await log.save()

  logAudit({ user: authResult.user, action: `task.${action}`, targetType: 'TaskLog', targetId: logId, details: { note: note || null, mentorId: log.mentorId.toString() }, request })

  if (action === 'flagged') {
    const notification = await Notification.create({
      recipientId: log.mentorId,
      type: 'task_flagged',
      message: `Your task log for ${log.date.toDateString()} was flagged${note ? `: ${note}` : '.'}`,
      relatedId: log._id,
    })
    sendToUser(log.mentorId.toString(), {
      type: 'notification',
      data: notification.toObject(),
    })
  }

  return NextResponse.json({ log })
}
