import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Directive from '@/models/Directive'
import { logAudit } from '@/lib/audit'

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

  logAudit({ user: authResult.user, action: 'directive.update', targetType: 'Directive', targetId: params.id, details: { changed: Object.keys(updates) }, request })

  return NextResponse.json({ directive })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { searchParams } = new URL(request.url)
  const permanent = searchParams.get('permanent') === 'true'

  if (permanent) {
    const directive = await Directive.findByIdAndDelete(params.id)
    if (!directive) return NextResponse.json({ error: 'Directive not found' }, { status: 404 })
    logAudit({ user: authResult.user, action: 'directive.archive', targetType: 'Directive', targetId: params.id, details: { title: directive.title, permanent: true }, request })
    return NextResponse.json({ message: 'Directive deleted' })
  }

  const directive = await Directive.findByIdAndUpdate(params.id, { isActive: false }, { new: true })
  if (!directive) return NextResponse.json({ error: 'Directive not found' }, { status: 404 })

  logAudit({ user: authResult.user, action: 'directive.archive', targetType: 'Directive', targetId: params.id, details: { title: directive.title }, request })

  return NextResponse.json({ message: 'Directive archived' })
}
