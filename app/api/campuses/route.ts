import { NextRequest, NextResponse } from 'next/server'
import { authenticate, authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listCampuses, createCampus } from '@/lib/services/campuses.service'

export async function GET(request: NextRequest) {
  try {
    authenticate(request)
    const region = new URL(request.url).searchParams.get('region')
    const campuses = await listCampuses(region)
    return NextResponse.json({ campuses })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    authorize(request, ['admin'])
    const body = await request.json()
    const campus = await createCampus(body)
    return NextResponse.json({ campus }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
