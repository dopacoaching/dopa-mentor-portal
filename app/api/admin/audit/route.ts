import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listAuditLogs } from '@/lib/services/admin.service'

export async function GET(request: NextRequest) {
  try {
    authorize(request, ['admin'])
    const { searchParams } = new URL(request.url)
    const result = await listAuditLogs({
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 50),
      action: searchParams.get('action'),
      userId: searchParams.get('userId'),
      userRole: searchParams.get('userRole'),
      search: searchParams.get('search'),
      sort: searchParams.get('sort') ?? 'newest',
    })
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
