import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Directive from '@/models/Directive'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json()
  const directive = await Directive.findByIdAndUpdate(params.id, body, { new: true })
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
