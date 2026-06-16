import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { getVisit, updateVisit } from '@/lib/services/visits.service'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = authenticate(request)
    const visit = await getVisit(user, params.id)
    return NextResponse.json({ visit })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = authenticate(request)
    const body = await request.json()
    const visit = await updateVisit(user, params.id, body, request)
    return NextResponse.json({ visit })
  } catch (error) {
    return handleApiError(error)
  }
}
