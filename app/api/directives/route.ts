import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, requireAuth, isAuthResult } from '@/lib/middleware'
import Directive from '@/models/Directive'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { sendToUser } from '@/lib/sse'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const query: Record<string, unknown> = { isActive: true, month, year }

  if (user.role === 'mentor') {
    const me = await User.findById(user.userId).select('region campus')
    query.$or = [
      { targetScope: 'all' },
      { targetScope: 'region', targetRegion: me?.region },
      { targetScope: 'campus', targetCampus: me?.campus },
      { targetScope: 'individual', targetMentorId: user.userId },
    ]
  } else if (user.role === 'regional_head') {
    query.$or = [
      { targetScope: 'all' },
      { targetScope: 'regional_head' },
    ]
  }

  const directives = await Directive.find(query)
    .populate('publishedBy', 'name')
    .sort({ publishedAt: -1 })

  return NextResponse.json({ directives })
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json()
  const { title, content, targetScope, targetRegion, targetCampus, targetMentorId } = body

  if (!title || !content || !targetScope) {
    return NextResponse.json({ error: 'title, content, targetScope required' }, { status: 400 })
  }
  if (!['all', 'region', 'campus', 'individual', 'regional_head'].includes(targetScope)) {
    return NextResponse.json({ error: 'Invalid targetScope' }, { status: 400 })
  }
  if (targetScope === 'region' && !targetRegion) {
    return NextResponse.json({ error: 'targetRegion required when scope is region' }, { status: 400 })
  }
  if (targetScope === 'campus' && !targetCampus) {
    return NextResponse.json({ error: 'targetCampus required when scope is campus' }, { status: 400 })
  }
  if (targetScope === 'individual' && !targetMentorId) {
    return NextResponse.json({ error: 'targetMentorId required when scope is individual' }, { status: 400 })
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const expiresAt = new Date(year, month, 0, 23, 59, 59)

  const directive = await Directive.create({
    title, content, targetScope,
    targetRegion: targetRegion || null,
    targetCampus: targetCampus || null,
    targetMentorId: targetMentorId || null,
    publishedBy: authResult.user.userId,
    month, year, expiresAt,
    isActive: true,
    publishedAt: now,
  })

  // Build recipient query based on scope
  let recipientQuery: Record<string, unknown>
  if (targetScope === 'regional_head') {
    recipientQuery = { role: 'regional_head', isActive: true }
  } else {
    recipientQuery = { role: 'mentor', isActive: true }
    if (targetScope === 'region' && targetRegion) recipientQuery.region = targetRegion
    if (targetScope === 'campus' && targetCampus) recipientQuery.campus = targetCampus
    if (targetScope === 'individual' && targetMentorId) recipientQuery._id = targetMentorId
  }

  const recipients = await User.find(recipientQuery).select('_id')
  await Promise.all(recipients.map(async (r) => {
    const notif = await Notification.create({
      recipientId: r._id,
      type: 'directive_published',
      message: `New directive: ${title}`,
      relatedId: directive._id,
    })
    sendToUser(r._id.toString(), { type: 'notification', data: notif.toObject() })
  }))

  logAudit({ user: authResult.user, action: 'directive.create', targetType: 'Directive', targetId: directive._id.toString(), details: { title, targetScope }, request })

  return NextResponse.json({ directive }, { status: 201 })
}
