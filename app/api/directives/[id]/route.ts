import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Directive from '@/models/Directive'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json()
  const { title, content, targetScope, targetRegion, targetCampus, targetMentorId, isActive } = body
  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (targetScope !== undefined) updates.targetScope = targetScope
  if (targetRegion !== undefined) updates.targetRegion = targetRegion ?? null
  if (targetCampus !== undefined) updates.targetCampus = targetCampus ?? null
  if (targetMentorId !== undefined) updates.targetMentorId = targetMentorId ?? null
  if (isActive !== undefined) updates.isActive = isActive
  const directive = await Directive.findByIdAndUpdate(params.id, { $set: updates }, { new: true })
  if (!directive) return NextResponse.json({ error: 'Directive not found' }, { status: 404 })
  return NextResponse.json({ directive })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const directive = await Directive.findByIdAndUpdate(params.id, { isActive: false }, { new: true })
  if (!directive) return NextResponse.json({ error: 'Directive not found' }, { status: 404 })
  return NextResponse.json({ message: 'Directive archived' })
}
