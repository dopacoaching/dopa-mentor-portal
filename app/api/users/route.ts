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

  const sortParam = searchParams.get('sort') ?? 'name'
  const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
    name:    { name: 1 },
    newest:  { createdAt: -1 },
    oldest:  { createdAt: 1 },
    role:    { role: 1, name: 1 },
    campus:  { campus: 1, name: 1 },
  }
  const sortOrder = SORT_MAP[sortParam] ?? SORT_MAP.name

  const query: Record<string, unknown> = {}

  if (user.role === 'admin') {
    if (roleFilter) query.role = roleFilter
    if (regionParam) query.region = regionParam
  } else if (user.role === 'regional_head') {
    if (roleFilter === 'admin') {
      query.role = 'admin'
    } else {
      // Show class_teachers and mentors in their own region
      const me = await User.findById(user.userId).select('region').lean()
      query.role = roleFilter === 'mentor' ? 'mentor' : 'class_teacher'
      if (me?.region) query.region = me.region
    }
  } else if (user.role === 'class_teacher') {
    if (roleFilter === 'mentor') {
      // CTs may browse mentors in their campus
      const me = await User.findById(user.userId).select('campus').lean()
      query.role = 'mentor'
      if (me?.campus) query.campus = me.campus
    } else if (roleFilter === 'admin') {
      query.role = 'admin'
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    // mentor: only admins (for chat)
    if (roleFilter !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    query.role = 'admin'
  }

  if (activeOnly) query.isActive = { $ne: false }

  const users = await User.find(query).select('-password').sort(sortOrder)
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
