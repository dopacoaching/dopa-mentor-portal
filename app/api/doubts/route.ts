import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { logDoubts } from '@/lib/services/doubts.service'

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['mentor'])
    const body = await request.json()
    const result = await logDoubts(user, body, request)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
