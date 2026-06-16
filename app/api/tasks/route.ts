import { NextRequest, NextResponse } from 'next/server'
import { authenticate, authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listTaskLogs, submitTaskLog } from '@/lib/services/tasks.service'

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request)
    const { searchParams } = new URL(request.url)
    const logs = await listTaskLogs(user, searchParams.get('month'), searchParams.get('year'))
    return NextResponse.json({ logs })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['mentor'])
    const body = await request.json()
    const { log, created } = await submitTaskLog(user, body, request)
    return NextResponse.json({ log }, { status: created ? 201 : 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
