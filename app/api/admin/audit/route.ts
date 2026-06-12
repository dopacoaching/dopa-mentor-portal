import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, isAuthResult } from '@/lib/middleware'
import AuditLog from '@/models/AuditLog'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)))
  const action = searchParams.get('action')
  const userId = searchParams.get('userId')
  const userRole = searchParams.get('userRole')
  const search = searchParams.get('search')

  const query: Record<string, unknown> = {}
  if (action) query.action = action
  if (userId) query.userId = userId
  if (userRole) query.userRole = userRole
  if (search) query.userName = { $regex: search, $options: 'i' }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ])

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) })
}
