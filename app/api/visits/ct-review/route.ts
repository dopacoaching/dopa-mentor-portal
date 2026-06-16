import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listCtReviews, createCtReview } from '@/lib/services/visits.service'

export async function GET(request: NextRequest) {
  try {
    const user = authorize(request, ['class_teacher', 'admin', 'regional_head'])
    const { searchParams } = new URL(request.url)
    const reviews = await listCtReviews(user, {
      visitId: searchParams.get('visitId'),
      mentorId: searchParams.get('mentorId'),
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    })
    return NextResponse.json({ reviews })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['class_teacher', 'admin'])
    const body = await request.json()
    const review = await createCtReview(user, body, request)
    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
