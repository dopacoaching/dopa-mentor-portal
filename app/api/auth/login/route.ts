import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/auth'
import { handleApiError } from '@/lib/api/errors'
import { login } from '@/lib/services/auth.service'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const { token, user } = await login(username, password, request)

    const response = NextResponse.json({ user })
    setAuthCookie(response, token)
    return response
  } catch (error) {
    return handleApiError(error)
  }
}
