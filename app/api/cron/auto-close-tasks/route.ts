import { NextRequest, NextResponse } from 'next/server'
import { assertCronAuthorized } from '@/lib/api/cron'
import { handleApiError } from '@/lib/api/errors'
import { autoCloseTasks } from '@/lib/services/cron.service'

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request)
    const result = await autoCloseTasks()
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
