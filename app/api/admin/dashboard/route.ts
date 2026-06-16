import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { getDashboard } from '@/lib/services/admin.service'

export async function GET(request: NextRequest) {
  try {
    authorize(request, ['admin'])
    const data = await getDashboard()
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}
