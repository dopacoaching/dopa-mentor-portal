import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listUsers, createUser } from '@/lib/services/users.service'

export async function GET(request: NextRequest) {
  try {
    const user = authorize(request, ['admin', 'class_teacher', 'mentor', 'regional_head'])
    const { searchParams } = new URL(request.url)
    const users = await listUsers(user, {
      role: searchParams.get('role'),
      region: searchParams.get('region'),
      activeOnly: searchParams.get('active') === 'true',
      sort: searchParams.get('sort') ?? 'name',
    })
    return NextResponse.json({ users })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authorize(request, ['admin', 'regional_head'])
    const body = await request.json()
    const created = await createUser(user, body, request)
    return NextResponse.json({ user: created }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
