import { NextResponse } from 'next/server'

/**
 * Domain-level error thrown by service functions. Controllers map these to
 * HTTP responses via {@link handleApiError}. Services should never import or
 * return Next.js HTTP types — they throw ApiError instead.
 */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  static badRequest(message: string) {
    return new ApiError(400, message)
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message)
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message)
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message)
  }
  static conflict(message: string) {
    return new ApiError(409, message)
  }
}

/**
 * Converts a thrown value into a JSON NextResponse. Known ApiErrors keep their
 * status and message; anything else becomes a 500 (logged server-side).
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API] Unhandled error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
