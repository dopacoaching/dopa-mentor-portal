import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { requireRole, requireAuth, isAuthResult } from '@/lib/middleware'
import User from '@/models/User'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult

  if (user.role === 'mentor' && user.userId !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const found = await User.findById(params.id).select('-password')
  if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user: found })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json()
  const { name, role, region, campus, assignedBatches, isActive, newPassword } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (role !== undefined) updates.role = role
  if (region !== undefined) updates.region = region || null
  if (campus !== undefined) updates.campus = campus || null
  if (assignedBatches !== undefined) updates.assignedBatches = assignedBatches
  if (isActive !== undefined) updates.isActive = isActive
  if (newPassword) updates.password = await bcrypt.hash(newPassword, 10)

  const updated = await User.findByIdAndUpdate(params.id, updates, { new: true }).select('-password')
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const deleted = await User.findByIdAndDelete(params.id)
  if (!deleted) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ message: 'User deleted' })
}
