import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import Visit from '@/models/Visit'
import CTVisitReview from '@/models/CTVisitReview'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['class_teacher', 'admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { searchParams } = new URL(request.url)
  const visitId = searchParams.get('visitId')
  const mentorId = searchParams.get('mentorId')
  const { user } = authResult

  const query: Record<string, unknown> = {}
  if (visitId) query.visitId = visitId
  if (mentorId) query.mentorId = mentorId
  if (user.role === 'class_teacher') query.classTeacherId = user.userId

  const reviews = await CTVisitReview.find(query).sort({ createdAt: -1 })
  return NextResponse.json({ reviews })
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['class_teacher', 'admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const body = await request.json()
  const { visitId, wasPunctual, interactionQuality, interactionComments, directiveCovered, overallEffectiveness, observations, recommendedAction } = body

  if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })

  const visit = await Visit.findById(visitId)
  if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

  if (user.role === 'class_teacher' && visit.classTeacherId.toString() !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await CTVisitReview.findOne({ visitId })
  if (existing) return NextResponse.json({ error: 'Review already submitted' }, { status: 409 })

  const review = await CTVisitReview.create({
    visitId,
    classTeacherId: user.userId,
    mentorId: visit.mentorId,
    visitDate: visit.visitDate,
    wasPunctual: wasPunctual ?? true,
    interactionQuality: interactionQuality ?? 3,
    interactionComments: interactionComments ?? '',
    directiveCovered: directiveCovered ?? 'yes',
    overallEffectiveness: overallEffectiveness ?? 3,
    observations: observations ?? '',
    recommendedAction: recommendedAction ?? 'none',
    submittedAt: new Date(),
  })

  visit.ctReviewSubmitted = true
  if (visit.mentorReportSubmitted && visit.status === 'completed') {
    visit.countedForPayment = true
  }
  await visit.save()

  return NextResponse.json({ review }, { status: 201 })
}
