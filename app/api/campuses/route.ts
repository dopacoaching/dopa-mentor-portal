import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireRole, requireAuth, isAuthResult } from '@/lib/middleware'
import Campus from '@/models/Campus'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region')

  const query: Record<string, unknown> = { isActive: true }
  if (region) query.region = region

  const campuses = await Campus.find(query).sort({ name: 1 })
  return NextResponse.json({ campuses })
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { name, region } = await request.json()

  if (!name || !region) {
    return NextResponse.json({ error: 'name and region are required' }, { status: 400 })
  }

  const existing = await Campus.findOne({ name: name.trim(), region })
  if (existing) {
    return NextResponse.json({ error: 'Campus already exists in this region' }, { status: 409 })
  }

  const campus = await Campus.create({ name: name.trim(), region })
  return NextResponse.json({ campus }, { status: 201 })
}
