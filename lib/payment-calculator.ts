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

  const hasVerifiedTask = taskLogs.some((log) => log.status === 'verified')

  const meetingPay = meetingAttended ? 500 : 0

  if (mentorType === 'offline') {
    return calculateOfflinePayment({
      mentorId,
      mentorName,
      month,
      year,
      completedVisits,
      totalDoubts,
      totalSubjects,
      hasVerifiedTask,
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
      totalDoubts,
      hasVerifiedTask,
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
  totalDoubts: number
  totalSubjects: { physics: number; chemistry: number; biology: number; mathematics: number; general: number }
  hasVerifiedTask: boolean
  meetingPay: number
  meetingAttended: boolean
}): PaymentBreakdown {
  const {
    mentorId,
    mentorName,
    month,
    year,
    completedVisits,
    totalDoubts,
    totalSubjects,
    hasVerifiedTask,
    meetingPay,
    meetingAttended,
  } = params

  const basicPay = 3000
  const dteamPay = hasVerifiedTask ? 1500 : 0

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

  let travelAllowance = 0
  if (completedVisits >= 3) travelAllowance = 1000
  else if (completedVisits === 2) travelAllowance = 667
  else if (completedVisits === 1) travelAllowance = 334

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
      taskVerified: hasVerifiedTask,
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
  totalDoubts: number
  hasVerifiedTask: boolean
  meetingPay: number
  meetingAttended: boolean
  visits: IVisitDocument[]
}): PaymentBreakdown {
  const {
    mentorId,
    mentorName,
    month,
    year,
    totalDoubts,
    hasVerifiedTask,
    meetingPay,
    meetingAttended,
    visits,
  } = params

  const basicPay = 1000
  const whatsappActivities = hasVerifiedTask ? 1000 : 0
  const weeklyQuiz = visits.some((v) => (v.visitType === 'campus_group' || v.visitType === 'merged_group') && v.countedForPayment)
    ? 750
    : 0
  const oneToOne = visits.some((v) => v.visitType === 'one_to_one' && v.countedForPayment)
    ? 750
    : 0
  const doubtWeb = totalDoubts >= 300 ? 2000 : 0
  const total = Math.min(
    6000,
    basicPay + whatsappActivities + weeklyQuiz + oneToOne + doubtWeb + meetingPay
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
    travelAllowance: weeklyQuiz + oneToOne,
    meetingPay,
    total,
    details: {
      completedVisits: params.completedVisits,
      totalDoubts,
      extraDoubts: Math.max(0, totalDoubts - 300),
      taskVerified: hasVerifiedTask,
      meetingAttended,
    },
  }
}
