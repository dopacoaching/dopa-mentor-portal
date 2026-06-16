import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { submitMentorReport } from '@/lib/services/visits.service'

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['mentor'])
    const body = await request.json()
    const report = await submitMentorReport(user, body, request)
    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
