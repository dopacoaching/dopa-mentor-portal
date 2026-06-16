import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { respondToVisit } from '@/lib/services/visits.service'

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['mentor'])
    const body = await request.json()
    const visit = await respondToVisit(user, body, request)
    return NextResponse.json({ visit })
  } catch (error) {
    return handleApiError(error)
  }
}
