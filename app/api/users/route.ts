import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import User from '@/models/User'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['admin', 'class_teacher'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const region = searchParams.get('region')

  const query: Record<string, unknown> = {}
  if (role) query.role = role
  if (region && user.role === 'admin') query.region = region

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
  return NextResponse.json({ user: userObj }, { status: 201 })
}
