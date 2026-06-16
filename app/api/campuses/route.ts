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

  const REGION_CANONICAL: Record<string, string> = {
    calicut: 'Calicut', kottakkal: 'Kottakkal', thrissur: 'Thrissur', ig: 'IG',
  }

  const query: Record<string, unknown> = { isActive: { $ne: false } }
  if (region) {
    const escaped = region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.region = { $regex: new RegExp(`^${escaped}$`, 'i') }
  }

  const raw = await Campus.find(query).sort({ name: 1 }).lean()

  // Normalize legacy lowercase region values to canonical casing
  const campuses = raw.map((c) => ({
    ...c,
    region: REGION_CANONICAL[c.region?.toLowerCase()] ?? c.region,
  }))

  return NextResponse.json({ campuses })
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['admin'])
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { name, region, batches } = await request.json()

  if (!name || !region) {
    return NextResponse.json({ error: 'name and region are required' }, { status: 400 })
  }

  const existing = await Campus.findOne({ name: name.trim(), region })
  if (existing) {
    return NextResponse.json({ error: 'Campus already exists in this region' }, { status: 409 })
  }

  const normalizedBatches = (batches ?? [])
    .filter((b: { batchName?: string; batchType?: string }) => b.batchName?.trim())
    .map((b: { batchName: string; batchType: string }) => ({
      batchId: b.batchName.trim().toLowerCase().replace(/\s+/g, '_'),
      batchName: b.batchName.trim(),
      batchType: b.batchType || 'residential',
    }))

  const campus = await Campus.create({ name: name.trim(), region, batches: normalizedBatches })
  return NextResponse.json({ campus }, { status: 201 })
}
