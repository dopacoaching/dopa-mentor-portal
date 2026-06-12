import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, isAuthResult } from '@/lib/middleware'
import Visit from '@/models/Visit'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const visit = await Visit.findById(params.id)
    .populate('mentorId', 'name username campus')
    .populate('classTeacherId', 'name')

  if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

  const { user } = authResult
  if (user.role === 'mentor' && visit.mentorId._id.toString() !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ visit })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const body = await request.json()
  const visit = await Visit.findById(params.id)
  if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

  const { user } = authResult
  if (user.role === 'mentor' && visit.mentorId.toString() !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ADMIN_FIELDS = ['visitDate', 'visitType', 'batchId', 'campus', 'status', 'ctRemark', 'mentorReportSubmitted', 'ctReviewSubmitted', 'countedForPayment']
  const MENTOR_FIELDS = ['mentorChangeReason']
  const allowed = user.role === 'admin' ? ADMIN_FIELDS : user.role === 'class_teacher' ? ADMIN_FIELDS : MENTOR_FIELDS
  const safe = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  Object.assign(visit, safe)
  await visit.save()

  logAudit({ user, action: 'visit.update', targetType: 'Visit', targetId: params.id, details: { changed: Object.keys(safe) }, request })

  return NextResponse.json({ visit })
}
