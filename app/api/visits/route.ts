import { NextRequest, NextResponse } from 'next/server'
import { authenticate, authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listVisits, scheduleVisit } from '@/lib/services/visits.service'

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request)
    const { searchParams } = new URL(request.url)
    const visits = await listVisits(user, {
      month: searchParams.get('month'),
      year: searchParams.get('year'),
      mentorId: searchParams.get('mentorId'),
    })
    return NextResponse.json({ visits })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['class_teacher', 'admin'])
    const body = await request.json()
    const visit = await scheduleVisit(user, body, request)
    return NextResponse.json({ visit }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
