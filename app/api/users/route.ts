import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import User from '@/models/User'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['admin', 'class_teacher', 'mentor', 'regional_head'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const { searchParams } = new URL(request.url)
  const roleFilter = searchParams.get('role')
  const regionParam = searchParams.get('region')
  const activeOnly = searchParams.get('active') === 'true'

  const query: Record<string, unknown> = {}

  if (user.role === 'admin') {
    if (roleFilter) query.role = roleFilter
    if (regionParam) query.region = regionParam
  } else if (user.role === 'regional_head') {
    if (roleFilter === 'admin') {
      query.role = 'admin'
    } else {
      // Show class teachers in their own region
      const me = await User.findById(user.userId).select('region').lean()
      query.role = 'class_teacher'
      if (me?.region) query.region = me.region
    }
  } else {
    // mentor, class_teacher: only admins (for chat)
    if (roleFilter !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    query.role = 'admin'
  }

  if (activeOnly) query.isActive = true

  const users = await User.find(query).select('-password').sort({ name: 1 })
  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['admin', 'regional_head'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const body = await request.json()
  const { name, username, password, role, campus, assignedBatches } = body
  let { region } = body

  if (!name || !username || !password || !role) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  // regional_head can only create class teachers
  if (user.role === 'regional_head' && role !== 'class_teacher') {
    return NextResponse.json({ error: 'Regional heads can only create class teachers' }, { status: 403 })
  }

  // regional_head's region is auto-assigned from their own profile
  if (user.role === 'regional_head') {
    const me = await User.findById(user.userId).select('region').lean()
    region = me?.region ?? null
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
