import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, isAuthResult } from '@/lib/middleware'
import DoubtLog from '@/models/DoubtLog'

export async function GET(
  request: NextRequest,
  { params }: { params: { mentorId: string } }
) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  const { user } = authResult
  if (user.role === 'mentor' && user.userId !== params.mentorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const { searchParams } = new URL(request.url)
  const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())

  const logs = await DoubtLog.find({ mentorId: params.mentorId, month, year }).sort({ date: 1 })

  const summary = logs.reduce(
    (acc, log) => {
      acc.physics += log.subjects.physics
      acc.chemistry += log.subjects.chemistry
      acc.biology += log.subjects.biology
      acc.mathematics += log.subjects.mathematics
      acc.general += log.subjects.general
      acc.total += log.totalForDay
      return acc
    },
    { physics: 0, chemistry: 0, biology: 0, mathematics: 0, general: 0, total: 0 }
  )

  return NextResponse.json({ logs, summary })
}
