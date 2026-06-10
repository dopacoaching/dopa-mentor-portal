import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, isAuthResult } from '@/lib/middleware'
import TaskLog from '@/models/TaskLog'

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
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const query: Record<string, unknown> = { mentorId: params.mentorId }
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
    query.date = { $gte: start, $lte: end }
  }

  const logs = await TaskLog.find(query).sort({ date: -1 })
  return NextResponse.json({ logs })
}
