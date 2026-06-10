import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from './auth'
import type { Role, JWTPayload } from '@/types'

export type AuthResult =
  | { user: JWTPayload }
  | NextResponse

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = verifyJWT(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
  return { user: payload }
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: Role[]
): Promise<AuthResult> {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { user } = authResult
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { user }
}

export function isAuthResult(result: AuthResult): result is { user: JWTPayload } {
  return 'user' in result
}
