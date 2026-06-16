import { NextRequest, NextResponse } from 'next/server'
import { assertCronAuthorized } from '@/lib/api/cron'
import { handleApiError } from '@/lib/api/errors'
import { checkUnverifiedTasks } from '@/lib/services/cron.service'

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request)
    const result = await checkUnverifiedTasks()
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
