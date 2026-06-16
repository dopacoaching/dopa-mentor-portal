import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { getMonthlyPayments } from '@/lib/services/payments.service'

export async function GET(request: NextRequest, { params }: { params: { month: string } }) {
  try {
    const user = authorize(request, ['admin', 'mentor'])
    const meetingAttended = new URL(request.url).searchParams.get('meetingAttended') === 'true'
    const result = await getMonthlyPayments(user, params.month, meetingAttended)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
