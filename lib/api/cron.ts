import type { NextRequest } from 'next/server'
import { ApiError } from './errors'

/**
 * Guards cron endpoints. In production the request must carry
 * `Authorization: Bearer <CRON_SECRET>`; outside production it is allowed
 * (so jobs can be triggered manually in dev). Throws ApiError(401) otherwise.
 */
export function assertCronAuthorized(request: NextRequest): void {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    throw ApiError.unauthorized()
  }
}
