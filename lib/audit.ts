import type { NextRequest } from 'next/server'
import { connectDB } from './mongodb'
import AuditLog from '@/models/AuditLog'
import User from '@/models/User'
import type { JWTPayload } from '@/types'

export interface AuditParams {
  user: JWTPayload
  userName?: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
  request?: NextRequest
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await connectDB()
    let name = params.userName
    if (!name) {
      const u = await User.findById(params.user.userId).select('name').lean()
      name = (u as { name?: string })?.name ?? 'Unknown'
    }
    const ip = params.request
      ? (params.request.headers.get('x-forwarded-for') ?? params.request.headers.get('x-real-ip') ?? null)
      : null
    await AuditLog.create({
      userId: params.user.userId,
      userName: name,
      userRole: params.user.role,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      details: params.details ?? {},
      ip,
    })
  } catch {
    // Fire-and-forget — never crash the main flow
  }
}
