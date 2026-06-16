import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { generateReport } from '@/lib/services/reports.service'

export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
  try {
    authorize(request, ['admin'])
    const { searchParams } = new URL(request.url)
    const data = await generateReport(params.type, {
      month: Number(searchParams.get('month') ?? new Date().getMonth() + 1),
      year: Number(searchParams.get('year') ?? new Date().getFullYear()),
      mentorId: searchParams.get('mentorId'),
      campus: searchParams.get('campus'),
    })
    return NextResponse.json({ type: params.type, data, generatedAt: new Date().toISOString() })
  } catch (error) {
    return handleApiError(error)
  }
}
