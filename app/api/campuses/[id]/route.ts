import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Campus from '@/models/Campus'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json()
  const { batches } = body

  const normalizedBatches = (batches ?? [])
    .filter((b: { batchName?: string; batchType?: string }) => b.batchName?.trim())
    .map((b: { batchName: string; batchType: string }) => ({
      batchId: b.batchName.trim().toLowerCase().replace(/\s+/g, '_'),
      batchName: b.batchName.trim(),
      batchType: b.batchType || 'residential',
    }))

  const updated = await Campus.findByIdAndUpdate(
    params.id,
    { batches: normalizedBatches },
    { new: true }
  )
  if (!updated) return NextResponse.json({ error: 'Campus not found' }, { status: 404 })
  return NextResponse.json({ campus: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  await Campus.findByIdAndDelete(params.id)
  return NextResponse.json({ ok: true })
}
