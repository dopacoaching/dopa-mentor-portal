import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { getCurrentUser } from '@/lib/services/auth.service'

export async function GET(request: NextRequest) {
  try {
    const auth = authenticate(request)
    const user = await getCurrentUser(auth.userId)
    return NextResponse.json({ user })
  } catch (error) {
    return handleApiError(error)
  }
}
