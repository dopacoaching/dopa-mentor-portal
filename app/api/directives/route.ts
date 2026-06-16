import { NextRequest, NextResponse } from 'next/server'
import { authenticate, authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listDirectives, createDirective } from '@/lib/services/directives.service'

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request)
    const directives = await listDirectives(user)
    return NextResponse.json({ directives })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['admin'])
    const body = await request.json()
    const directive = await createDirective(user, body, request)
    return NextResponse.json({ directive }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
