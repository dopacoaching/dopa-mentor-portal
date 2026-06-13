import type { PaymentBreakdown } from '@/types'
import type { ITaskLogDocument } from '@/models/TaskLog'
import type { IDoubtLogDocument } from '@/models/DoubtLog'
import type { IVisitDocument } from '@/models/Visit'

interface PaymentInput {
  mentorId: string
  mentorName: string
  mentorType: 'offline' | 'online'
  month: number
  year: number
  taskLogs: ITaskLogDocument[]
  doubtLogs: IDoubtLogDocument[]
  visits: IVisitDocument[]
  meetingAttended: boolean
}

export function calculateMentorPayment(input: PaymentInput): PaymentBreakdown {
  const {
    mentorId,
    mentorName,
    mentorType,
    month,
    year,
    taskLogs,
    doubtLogs,
    visits,
    meetingAttended,
  } = input

  const completedVisits = visits.filter((v) => v.countedForPayment).length
  const verifiedDays = taskLogs.filter((log) => log.status === 'verified').length

  const totalSubjects = doubtLogs.reduce(
    (acc, log) => {
      acc.physics += log.subjects.physics
      acc.chemistry += log.subjects.chemistry
      acc.biology += log.subjects.biology
      acc.mathematics += log.subjects.mathematics
      acc.general += log.subjects.general
      return acc
    },
    { physics: 0, chemistry: 0, biology: 0, mathematics: 0, general: 0 }
  )

  const totalDoubts =
    totalSubjects.physics +
    totalSubjects.chemistry +
    totalSubjects.biology +
    totalSubjects.mathematics +
    totalSubjects.general

  const meetingPay = meetingAttended ? 500 : 0

  if (mentorType === 'offline') {
    return calculateOfflinePayment({
      mentorId,
      mentorName,
      month,
      year,
      completedVisits,
      verifiedDays,
      totalDoubts,
      totalSubjects,
      meetingPay,
      meetingAttended,
    })
  } else {
    return calculateOnlinePayment({
      mentorId,
      mentorName,
      month,
      year,
      completedVisits,
      verifiedDays,
      totalDoubts,
      meetingPay,
      meetingAttended,
      visits,
    })
  }
}

function calculateOfflinePayment(params: {
  mentorId: string
  mentorName: string
  month: number
  year: number
  completedVisits: number
  verifiedDays: number
  totalDoubts: number
  totalSubjects: { physics: number; chemistry: number; biology: number; mathematics: number; general: number }
  meetingPay: number
  meetingAttended: boolean
}): PaymentBreakdown {
  const {
    mentorId,
    mentorName,
    month,
    year,
    completedVisits,
    verifiedDays,
    totalDoubts,
    totalSubjects,
    meetingPay,
    meetingAttended,
  } = params

  const basicPay = 3000
  // ₹50 per day with a verified task log
  const dteamPay = verifiedDays * 50

  let doubtWebBase = 0
  let doubtWebExtra = 0

  if (totalDoubts >= 300) {
    doubtWebBase = 2000
    const extraDoubts = totalDoubts - 300

    if (extraDoubts > 0) {
      const ratio = {
        physics: totalSubjects.physics / totalDoubts,
        chemistry: totalSubjects.chemistry / totalDoubts,
        biology: totalSubjects.biology / totalDoubts,
        mathematics: totalSubjects.mathematics / totalDoubts,
        general: totalSubjects.general / totalDoubts,
      }

      const extraPhysics = Math.round(extraDoubts * ratio.physics)
      const extraChemistry = Math.round(extraDoubts * ratio.chemistry)
      const extraBiology = Math.round(extraDoubts * ratio.biology)
      const extraMath = Math.round(extraDoubts * ratio.mathematics)
      const extraGeneral = Math.round(extraDoubts * ratio.general)

      doubtWebExtra =
        extraPhysics * 10 +
        extraChemistry * 10 +
        extraBiology * 5 +
        extraMath * 5 +
        extraGeneral * 5
    }
  }

  // ₹1000 / 3 visits = ₹333.33 per visit, capped at ₹1000
  const travelAllowance = parseFloat(Math.min(1000, completedVisits * (1000 / 3)).toFixed(2))

  const total = basicPay + dteamPay + doubtWebBase + doubtWebExtra + travelAllowance + meetingPay

  return {
    mentorId,
    mentorName,
    mentorType: 'offline',
    month,
    year,
    basicPay,
    dteamPay,
    doubtWebBase,
    doubtWebExtra,
    travelAllowance,
    meetingPay,
    total,
    details: {
      completedVisits,
      totalDoubts,
      extraDoubts: Math.max(0, totalDoubts - 300),
      verifiedDays,
      meetingAttended,
    },
  }
}

function calculateOnlinePayment(params: {
  mentorId: string
  mentorName: string
  month: number
  year: number
  completedVisits: number
  verifiedDays: number
  totalDoubts: number
  meetingPay: number
  meetingAttended: boolean
  visits: IVisitDocument[]
}): PaymentBreakdown {
  const {
    mentorId,
    mentorName,
    month,
    year,
    verifiedDays,
    totalDoubts,
    meetingPay,
    meetingAttended,
    visits,
  } = params

  const basicPay = 1000
  const whatsappActivities = verifiedDays > 0 ? 1500 : 0
  const weeklyQuiz = visits.some((v) => (v.visitType === 'campus_group' || v.visitType === 'merged_group') && v.countedForPayment)
    ? 750
    : 0
  const oneToOne = visits.some((v) => v.visitType === 'one_to_one' && v.countedForPayment)
    ? 750
    : 0
  const doubtWeb = totalDoubts >= 300 ? 2000 : 0
  // Online mentors have no travel allowance; session pay (quiz + 1-on-1) is stored in travelAllowance field
  const sessionPay = weeklyQuiz + oneToOne
  const total = Math.min(
    6500,
    basicPay + whatsappActivities + sessionPay + doubtWeb + meetingPay
  )

  return {
    mentorId,
    mentorName,
    mentorType: 'online',
    month,
    year,
    basicPay,
    dteamPay: whatsappActivities,
    doubtWebBase: doubtWeb,
    doubtWebExtra: 0,
    travelAllowance: sessionPay,
    meetingPay,
    total,
    details: {
      completedVisits: params.completedVisits,
      totalDoubts,
      extraDoubts: Math.max(0, totalDoubts - 300),
      verifiedDays,
      meetingAttended,
    },
  }
}
