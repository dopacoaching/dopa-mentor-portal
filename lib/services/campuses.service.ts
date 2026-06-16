import { connectDB } from '@/lib/mongodb'
import Campus from '@/models/Campus'
import { ApiError } from '@/lib/api/errors'
import { canonicalRegion, escapeRegex } from '@/lib/utils'

interface BatchInput {
  batchName?: string
  batchType?: string
}

/** Normalizes incoming batch definitions into stored shape (drops empty names). */
function normalizeBatches(batches: BatchInput[] | undefined) {
  return (batches ?? [])
    .filter((b) => b.batchName?.trim())
    .map((b) => ({
      batchId: b.batchName!.trim().toLowerCase().replace(/\s+/g, '_'),
      batchName: b.batchName!.trim(),
      batchType: b.batchType || 'residential',
    }))
}

/** Active campuses, optionally filtered by region, with canonical region casing. */
export async function listCampuses(region: string | null) {
  await connectDB()
  const query: Record<string, unknown> = { isActive: { $ne: false } }
  if (region) {
    query.region = { $regex: new RegExp(`^${escapeRegex(region)}$`, 'i') }
  }

  const raw = await Campus.find(query).sort({ name: 1 }).lean()
  return raw.map((c) => ({
    ...c,
    region: c.region ? canonicalRegion(c.region) : c.region,
  }))
}

export async function createCampus(input: { name?: string; region?: string; batches?: BatchInput[] }) {
  await connectDB()
  const { name, region, batches } = input
  if (!name || !region) throw ApiError.badRequest('name and region are required')

  const existing = await Campus.findOne({ name: name.trim(), region })
  if (existing) throw ApiError.conflict('Campus already exists in this region')

  return Campus.create({ name: name.trim(), region, batches: normalizeBatches(batches) })
}

export async function updateCampusBatches(id: string, batches: BatchInput[] | undefined) {
  await connectDB()
  const updated = await Campus.findByIdAndUpdate(
    id,
    { batches: normalizeBatches(batches) },
    { new: true }
  )
  if (!updated) throw ApiError.notFound('Campus not found')
  return updated
}

export async function deleteCampus(id: string) {
  await connectDB()
  await Campus.findByIdAndDelete(id)
}
