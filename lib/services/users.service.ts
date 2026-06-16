import type { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { logAudit } from '@/lib/audit'
import { ApiError } from '@/lib/api/errors'
import type { JWTPayload } from '@/types'

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  name: { name: 1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  role: { role: 1, name: 1 },
  campus: { campus: 1, name: 1 },
}

/** Lists users visible to the requester, scoped by role. */
export async function listUsers(
  user: JWTPayload,
  filters: { role: string | null; region: string | null; activeOnly: boolean; sort: string }
) {
  await connectDB()
  const { role: roleFilter, region: regionParam, activeOnly } = filters
  const sortOrder = SORT_MAP[filters.sort] ?? SORT_MAP.name

  const query: Record<string, unknown> = {}

  if (user.role === 'admin') {
    if (roleFilter) query.role = roleFilter
    if (regionParam) query.region = regionParam
  } else if (user.role === 'regional_head') {
    if (roleFilter === 'admin') {
      query.role = 'admin'
    } else {
      const me = await User.findById(user.userId).select('region').lean()
      query.role = roleFilter === 'mentor' ? 'mentor' : 'class_teacher'
      if (me?.region) query.region = me.region
    }
  } else if (user.role === 'class_teacher') {
    if (roleFilter === 'mentor') {
      const me = await User.findById(user.userId).select('campus').lean()
      query.role = 'mentor'
      if (me?.campus) query.campus = me.campus
    } else if (roleFilter === 'admin') {
      query.role = 'admin'
    } else {
      throw ApiError.forbidden()
    }
  } else {
    // mentor: only admins (for chat)
    if (roleFilter !== 'admin') throw ApiError.forbidden()
    query.role = 'admin'
  }

  if (activeOnly) query.isActive = { $ne: false }

  return User.find(query).select('-password').sort(sortOrder)
}

/** Creates a user (admin / regional_head). Regional heads create only CTs in their region. */
export async function createUser(
  user: JWTPayload,
  body: Record<string, unknown>,
  request?: NextRequest
) {
  await connectDB()
  const { name, username, password, role, campus, assignedBatches } = body as {
    name?: string
    username?: string
    password?: string
    role?: string
    campus?: string
    assignedBatches?: unknown[]
  }
  let region = (body as { region?: string }).region

  if (!name || !username || !password || !role) {
    throw ApiError.badRequest('Required fields missing')
  }

  if (user.role === 'regional_head' && role !== 'class_teacher') {
    throw ApiError.forbidden('Regional heads can only create class teachers')
  }

  if (user.role === 'regional_head') {
    const me = await User.findById(user.userId).select('region').lean()
    region = me?.region ?? undefined
  }

  const existing = await User.findOne({ username: username.toLowerCase().trim() })
  if (existing) throw ApiError.conflict('Username already exists')

  const hashed = await bcrypt.hash(password, 10)

  const newUser = await User.create({
    name,
    username: username.toLowerCase().trim(),
    password: hashed,
    role,
    region: region || null,
    campus: campus || null,
    assignedBatches: assignedBatches || [],
    createdBy: user.userId,
  })

  const { password: _pw, ...userObj } = newUser.toObject()

  logAudit({ user, action: 'user.create', targetType: 'User', targetId: newUser._id.toString(), details: { name, username: username.toLowerCase().trim(), role }, request })

  return userObj
}

/** Single user; mentors may only view their own profile. */
export async function getUser(user: JWTPayload, id: string) {
  await connectDB()
  if (user.role === 'mentor' && user.userId !== id) throw ApiError.forbidden()
  const found = await User.findById(id).select('-password')
  if (!found) throw ApiError.notFound('User not found')
  return found
}

/** Updates a user. Regional heads may only toggle isActive for CTs in their region. */
export async function updateUser(
  user: JWTPayload,
  id: string,
  body: Record<string, unknown>,
  request?: NextRequest
) {
  await connectDB()
  const { name, role, region, campus, assignedBatches, isActive, newPassword } = body as {
    name?: string
    role?: string
    region?: string
    campus?: string
    assignedBatches?: unknown[]
    isActive?: boolean
    newPassword?: string
  }

  if (user.role === 'regional_head') {
    const target = await User.findById(id).select('role region').lean()
    if (!target || target.role !== 'class_teacher') throw ApiError.forbidden()
    const me = await User.findById(user.userId).select('region').lean()
    if (!me?.region || target.region !== me.region) throw ApiError.forbidden()
    if (isActive === undefined) throw ApiError.forbidden()
    const updated = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password')
    if (!updated) throw ApiError.notFound('User not found')
    logAudit({ user, action: 'user.update', targetType: 'User', targetId: id, details: { changed: ['isActive'] }, request })
    return updated
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (role !== undefined) updates.role = role
  if (region !== undefined) updates.region = region || null
  if (campus !== undefined) updates.campus = campus || null
  if (assignedBatches !== undefined) updates.assignedBatches = assignedBatches
  if (isActive !== undefined) updates.isActive = isActive
  if (newPassword) updates.password = await bcrypt.hash(newPassword, 10)

  const updated = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password')
  if (!updated) throw ApiError.notFound('User not found')

  const changedFields = Object.keys(updates).filter((k) => k !== 'password')
  logAudit({ user, action: 'user.update', targetType: 'User', targetId: id, details: { changed: changedFields, passwordChanged: !!newPassword }, request })

  return updated
}

export async function deleteUser(user: JWTPayload, id: string, request?: NextRequest) {
  await connectDB()
  const deleted = await User.findByIdAndDelete(id)
  if (!deleted) throw ApiError.notFound('User not found')

  logAudit({ user, action: 'user.delete', targetType: 'User', targetId: id, details: { name: deleted.name, username: deleted.username }, request })
}
