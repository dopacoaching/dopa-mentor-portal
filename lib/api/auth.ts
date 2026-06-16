import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { ApiError } from './errors'
import type { JWTPayload, Role } from '@/types'

/**
 * Returns the authenticated user or throws ApiError(401).
 * Controller-friendly counterpart to lib/middleware's requireAuth.
 */
export function authenticate(request: NextRequest): JWTPayload {
  const token = request.cookies.get('auth-token')?.value
  if (!token) throw ApiError.unauthorized()
  const payload = verifyJWT(token)
  if (!payload) throw ApiError.unauthorized('Invalid or expired token')
  return payload
}

/**
 * Returns the authenticated user if their role is allowed, otherwise throws
 * ApiError(401) when unauthenticated or ApiError(403) when role mismatches.
 */
export function authorize(request: NextRequest, allowedRoles: Role[]): JWTPayload {
  const user = authenticate(request)
  if (!allowedRoles.includes(user.role)) throw ApiError.forbidden()
  return user
}
