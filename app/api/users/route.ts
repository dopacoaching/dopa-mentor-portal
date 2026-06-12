import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import User from '@/models/User'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['admin', 'class_teacher', 'mentor'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const { searchParams } = new URL(request.url)
  const roleFilter = searchParams.get('role')
  const region = searchParams.get('region')
  const activeOnly = searchParams.get('active') === 'true'

  // Non-admins can only query admins (for chat)
  if (user.role !== 'admin' && roleFilter !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const query: Record<string, unknown> = {}
  if (roleFilter) query.role = roleFilter
  if (region && user.role === 'admin') query.region = region
  if (activeOnly) query.isActive = true

  const users = await User.find(query).select('-password').sort({ name: 1 })
  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json()
  const { name, username, password, role, region, campus, assignedBatches } = body

  if (!name || !username || !password || !role) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  const existing = await User.findOne({ username: username.toLowerCase().trim() })
  if (existing) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 10)

  const newUser = await User.create({
    name,
    username: username.toLowerCase().trim(),
    password: hashed,
    role,
    region: region || null,
    campus: campus || null,
    assignedBatches: assignedBatches || [],
    createdBy: authResult.user.userId,
  })

  const { password: _pw, ...userObj } = newUser.toObject()

  logAudit({ user: authResult.user, action: 'user.create', targetType: 'User', targetId: newUser._id.toString(), details: { name, username: username.toLowerCase().trim(), role }, request })

  return NextResponse.json({ user: userObj }, { status: 201 })
}
