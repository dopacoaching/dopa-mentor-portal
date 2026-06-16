import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listTaskLogsByMentor } from '@/lib/services/tasks.service'

export async function GET(request: NextRequest, { params }: { params: { mentorId: string } }) {
  try {
    const user = authenticate(request)
    const { searchParams } = new URL(request.url)
    const logs = await listTaskLogsByMentor(user, params.mentorId, searchParams.get('month'), searchParams.get('year'))
    return NextResponse.json({ logs })
  } catch (error) {
    return handleApiError(error)
  }
}
