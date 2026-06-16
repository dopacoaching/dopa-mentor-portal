import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { updateDirective, archiveDirective } from '@/lib/services/directives.service'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = authorize(request, ['admin'])
    const body = await request.json()
    const directive = await updateDirective(user, params.id, body, request)
    return NextResponse.json({ directive })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = authorize(request, ['admin'])
    const permanent = new URL(request.url).searchParams.get('permanent') === 'true'
    const message = await archiveDirective(user, params.id, permanent, request)
    return NextResponse.json({ message })
  } catch (error) {
    return handleApiError(error)
  }
}
