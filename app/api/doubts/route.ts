import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import DoubtLog from '@/models/DoubtLog'
import Notification from '@/models/Notification'
import { sendToUser } from '@/lib/sse'
import { getDayStart, getDayEnd } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['mentor'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const body = await request.json()
  const { physics = 0, chemistry = 0, biology = 0, mathematics = 0, general = 0 } = body

  const now = new Date()
  const todayStart = getDayStart(now)
  const todayEnd = getDayEnd(now)
  const total = physics + chemistry + biology + mathematics + general

  const existing = await DoubtLog.findOne({
    mentorId: user.userId,
    date: { $gte: todayStart, $lte: todayEnd },
  })

  let log
  if (existing) {
    existing.subjects = { physics, chemistry, biology, mathematics, general }
    existing.totalForDay = total
    log = await existing.save()
  } else {
    log = await DoubtLog.create({
      mentorId: user.userId,
      date: todayStart,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      subjects: { physics, chemistry, biology, mathematics, general },
      totalForDay: total,
    })
  }

  const monthTotal = await DoubtLog.aggregate([
    { $match: { mentorId: log.mentorId, month: now.getMonth() + 1, year: now.getFullYear() } },
    { $group: { _id: null, total: { $sum: '$totalForDay' } } },
  ])

  const monthlyTotal = monthTotal[0]?.total ?? 0
  if (monthlyTotal >= 300) {
    const alreadyNotified = await Notification.findOne({
      recipientId: user.userId,
      type: 'doubt_quota_reached',
      createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
    })
    if (!alreadyNotified) {
      const notification = await Notification.create({
        recipientId: user.userId,
        type: 'doubt_quota_reached',
        message: `You've cleared 300+ doubts this month! You're earning the Doubt Web bonus.`,
        relatedId: log._id,
      })
      sendToUser(user.userId, { type: 'notification', data: notification.toObject() })
    }
  }

  logAudit({ user, action: 'doubt.log', targetType: 'DoubtLog', targetId: log._id.toString(), details: { total, monthlyTotal }, request })

  return NextResponse.json({ log, monthlyTotal })
}
