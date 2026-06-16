import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { getMentorDoubts } from '@/lib/services/doubts.service'

export async function GET(request: NextRequest, { params }: { params: { mentorId: string } }) {
  try {
    const user = authenticate(request)
    const { searchParams } = new URL(request.url)
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
    const year = Number(searchParams.get('year') ?? new Date().getFullYear())
    const result = await getMentorDoubts(user, params.mentorId, month, year)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
