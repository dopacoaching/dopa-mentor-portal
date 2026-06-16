import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import DoubtLog from '@/models/DoubtLog'
import Notification from '@/models/Notification'
import { sendToUser } from '@/lib/sse'
import { getDayStart, getDayEnd } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import { ApiError } from '@/lib/api/errors'
import type { JWTPayload } from '@/types'

const DOUBT_WEB_QUOTA = 300

export interface DoubtCountsInput {
  physics?: number
  chemistry?: number
  biology?: number
  mathematics?: number
  general?: number
}

/** Records (or updates) a mentor's doubt counts for today; fires quota bonus notification. */
export async function logDoubts(user: JWTPayload, body: DoubtCountsInput, request?: NextRequest) {
  await connectDB()
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
  if (monthlyTotal >= DOUBT_WEB_QUOTA) {
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

  logAudit({
    user,
    action: 'doubt.log',
    targetType: 'DoubtLog',
    targetId: log._id.toString(),
    details: { total, monthlyTotal },
    request,
  })

  return { log, monthlyTotal }
}

/** Returns a mentor's daily doubt logs and aggregated monthly summary. */
export async function getMentorDoubts(
  requester: JWTPayload,
  mentorId: string,
  month: number,
  year: number
) {
  if (requester.role === 'mentor' && requester.userId !== mentorId) {
    throw ApiError.forbidden()
  }

  await connectDB()
  const logs = await DoubtLog.find({ mentorId, month, year }).sort({ date: 1 })

  const summary = logs.reduce(
    (acc, log) => {
      acc.physics += log.subjects.physics
      acc.chemistry += log.subjects.chemistry
      acc.biology += log.subjects.biology
      acc.mathematics += log.subjects.mathematics
      acc.general += log.subjects.general
      acc.total += log.totalForDay
      return acc
    },
    { physics: 0, chemistry: 0, biology: 0, mathematics: 0, general: 0, total: 0 }
  )

  return { logs, summary }
}
