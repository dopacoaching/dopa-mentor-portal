import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Directive from '@/models/Directive'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { logAudit } from '@/lib/audit'
import { ApiError } from '@/lib/api/errors'
import { canonicalRegion, escapeRegex } from '@/lib/utils'
import type { JWTPayload } from '@/types'

const VALID_SCOPES = ['all', 'region', 'campus', 'individual', 'regional_head'] as const

export interface CreateDirectiveInput {
  title?: string
  content?: string
  targetScope?: string
  targetRegion?: string
  targetCampus?: string
  targetMentorId?: string
}

/** Directives visible to the current user for the current month. */
export async function listDirectives(user: JWTPayload) {
  await connectDB()
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const query: Record<string, unknown> = { isActive: true, month, year }

  if (user.role === 'mentor') {
    const me = await User.findById(user.userId).select('region campus')
    const userRegion = me?.region ? canonicalRegion(me.region) : me?.region
    query.$or = [
      { targetScope: 'all' },
      { targetScope: 'region', targetRegion: userRegion },
      { targetScope: 'campus', targetCampus: me?.campus },
      { targetScope: 'individual', targetMentorId: user.userId },
    ]
  } else if (user.role === 'regional_head') {
    query.$or = [
      { targetScope: 'all' },
      { targetScope: 'regional_head' },
      { targetScope: 'individual', targetMentorId: user.userId },
    ]
  }

  return Directive.find(query).populate('publishedBy', 'name').sort({ publishedAt: -1 })
}

/** Creates a directive (admin only) and notifies matching recipients. */
export async function createDirective(
  user: JWTPayload,
  input: CreateDirectiveInput,
  request?: NextRequest
) {
  await connectDB()
  const { title, content, targetScope, targetRegion, targetCampus, targetMentorId } = input

  if (!title || !content || !targetScope) {
    throw ApiError.badRequest('title, content, targetScope required')
  }
  if (!VALID_SCOPES.includes(targetScope as (typeof VALID_SCOPES)[number])) {
    throw ApiError.badRequest('Invalid targetScope')
  }
  if (targetScope === 'region' && !targetRegion) {
    throw ApiError.badRequest('targetRegion required when scope is region')
  }
  if (targetScope === 'campus' && !targetCampus) {
    throw ApiError.badRequest('targetCampus required when scope is campus')
  }
  if (targetScope === 'individual' && !targetMentorId) {
    throw ApiError.badRequest('targetMentorId required when scope is individual')
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const expiresAt = new Date(year, month, 0, 23, 59, 59)

  const directive = await Directive.create({
    title,
    content,
    targetScope,
    targetRegion: targetRegion || null,
    targetCampus: targetCampus || null,
    targetMentorId: targetMentorId || null,
    publishedBy: user.userId,
    month,
    year,
    expiresAt,
    isActive: true,
    publishedAt: now,
  })

  // Build recipient query based on scope
  let recipientQuery: Record<string, unknown>
  if (targetScope === 'regional_head') {
    recipientQuery = { role: 'regional_head', isActive: { $ne: false } }
  } else {
    recipientQuery = { role: 'mentor', isActive: { $ne: false } }
    if (targetScope === 'region' && targetRegion) {
      recipientQuery.region = { $regex: new RegExp(`^${escapeRegex(targetRegion)}$`, 'i') }
    }
    if (targetScope === 'campus' && targetCampus) recipientQuery.campus = targetCampus
    if (targetScope === 'individual' && targetMentorId) recipientQuery._id = targetMentorId
  }

  const recipients = await User.find(recipientQuery).select('_id')
  await Promise.all(
    recipients.map((r) =>
      Notification.create({
        recipientId: r._id,
        type: 'directive_published',
        message: `New directive: ${title}`,
        relatedId: directive._id,
      })
    )
  )

  logAudit({
    user,
    action: 'directive.create',
    targetType: 'Directive',
    targetId: directive._id.toString(),
    details: { title, targetScope },
    request,
  })

  return directive
}

export interface UpdateDirectiveInput {
  title?: string
  content?: string
  targetScope?: string
  targetRegion?: string | null
  targetCampus?: string | null
  targetMentorId?: string | null
  isActive?: boolean
}

/** Updates an existing directive (admin only) with a field-by-field allow-list. */
export async function updateDirective(
  user: JWTPayload,
  id: string,
  input: UpdateDirectiveInput,
  request?: NextRequest
) {
  await connectDB()
  const { title, content, targetScope, targetRegion, targetCampus, targetMentorId, isActive } = input
  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (targetScope !== undefined) updates.targetScope = targetScope
  if (targetRegion !== undefined) updates.targetRegion = targetRegion ?? null
  if (targetCampus !== undefined) updates.targetCampus = targetCampus ?? null
  if (targetMentorId !== undefined) updates.targetMentorId = targetMentorId ?? null
  if (isActive !== undefined) updates.isActive = isActive

  const directive = await Directive.findByIdAndUpdate(id, { $set: updates }, { new: true })
  if (!directive) throw ApiError.notFound('Directive not found')

  logAudit({ user, action: 'directive.update', targetType: 'Directive', targetId: id, details: { changed: Object.keys(updates) }, request })

  return directive
}

/** Archives (soft delete) or permanently deletes a directive (admin only). */
export async function archiveDirective(
  user: JWTPayload,
  id: string,
  permanent: boolean,
  request?: NextRequest
) {
  await connectDB()

  if (permanent) {
    const directive = await Directive.findByIdAndDelete(id)
    if (!directive) throw ApiError.notFound('Directive not found')
    logAudit({ user, action: 'directive.archive', targetType: 'Directive', targetId: id, details: { title: directive.title, permanent: true }, request })
    return 'Directive deleted'
  }

  const directive = await Directive.findByIdAndUpdate(id, { isActive: false }, { new: true })
  if (!directive) throw ApiError.notFound('Directive not found')
  logAudit({ user, action: 'directive.archive', targetType: 'Directive', targetId: id, details: { title: directive.title }, request })
  return 'Directive archived'
}
