import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { updateCampusBatches, deleteCampus } from '@/lib/services/campuses.service'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    authorize(request, ['admin'])
    const { batches } = await request.json()
    const campus = await updateCampusBatches(params.id, batches)
    return NextResponse.json({ campus })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    authorize(request, ['admin'])
    await deleteCampus(params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
