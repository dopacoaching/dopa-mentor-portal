import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { verifyTaskLog } from '@/lib/services/tasks.service'

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['class_teacher', 'admin'])
    const body = await request.json()
    const log = await verifyTaskLog(user, body, request)
    return NextResponse.json({ log })
  } catch (error) {
    return handleApiError(error)
  }
}
