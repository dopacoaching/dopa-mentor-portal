import { NextRequest, NextResponse } from 'next/server'
import { authenticate, authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { getUser, updateUser, deleteUser } from '@/lib/services/users.service'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = authenticate(request)
    const found = await getUser(user, params.id)
    return NextResponse.json({ user: found })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = authorize(request, ['admin', 'regional_head'])
    const body = await request.json()
    const updated = await updateUser(user, params.id, body, request)
    return NextResponse.json({ user: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = authorize(request, ['admin'])
    await deleteUser(user, params.id, request)
    return NextResponse.json({ message: 'User deleted' })
  } catch (error) {
    return handleApiError(error)
  }
}
