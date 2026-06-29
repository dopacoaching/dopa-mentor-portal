import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { ApiError } from '@/lib/api/errors'
import type { JWTPayload } from '@/types'

/**
 * Throws ApiError(403) unless the requester is allowed to view/act on the given
 * mentor's data. Access rules:
 *  - admin          → any mentor
 *  - mentor         → only themselves
 *  - class_teacher  → mentors they are assigned to, or mentors in their campus
 *  - regional_head  → mentors in their region
 */
export async function assertCanAccessMentor(requester: JWTPayload, mentorId: string): Promise<void> {
  if (requester.role === 'admin') return

  if (requester.role === 'mentor') {
    if (requester.userId !== mentorId) throw ApiError.forbidden()
    return
  }

  await connectDB()

  if (requester.role === 'class_teacher') {
    const ct = await User.findById(requester.userId).select('assignedMentors campus').lean()
    const isAssigned = ct?.assignedMentors?.some((m) => m.toString() === mentorId)
    if (isAssigned) return
    if (ct?.campus) {
      const mentor = await User.findById(mentorId).select('campus').lean()
      if (mentor?.campus && mentor.campus === ct.campus) return
    }
    throw ApiError.forbidden()
  }

  if (requester.role === 'regional_head') {
    const rh = await User.findById(requester.userId).select('region').lean()
    if (rh?.region) {
      const mentor = await User.findById(mentorId).select('region').lean()
      if (mentor?.region && mentor.region === rh.region) return
    }
    throw ApiError.forbidden()
  }

  throw ApiError.forbidden()
}
