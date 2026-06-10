import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Campus from '@/models/Campus'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  await Campus.findByIdAndDelete(params.id)
  return NextResponse.json({ ok: true })
}
