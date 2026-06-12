export type Role = 'admin' | 'class_teacher' | 'mentor' | 'regional_head'
export type Region = 'Calicut' | 'Kottakkal' | 'Thrissur' | 'IG'
export type BatchType = 'residential' | 'online' | 'ig' | 'offline'

export interface AssignedBatch {
  batchId: string
  batchType: BatchType
  batchName: string
}

export interface IUser {
  _id: string
  name: string
  username: string
  role: Role
  isActive: boolean
  region: Region | null
  campus: string | null
  assignedBatches: AssignedBatch[]
  assignedMentors: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const TASK_KEYS = [
  'quote_of_day',
  'schedule_posting',
  'voice_note',
  'question_discussion',
  'tips_tricks',
  'clearing_queries',
  'exam_result_publishing',
  'campus_visit_time',
  'dteam_personal_chats',
] as const

export type TaskKey = typeof TASK_KEYS[number]

export const TASK_NAMES: Record<TaskKey, string> = {
  quote_of_day: 'Quote of the Day',
  schedule_posting: 'Schedule Posting',
  voice_note: 'Voice Note',
  question_discussion: 'Question Discussion',
  tips_tricks: 'Tips & Tricks',
  clearing_queries: 'Clearing Student Queries',
  exam_result_publishing: 'Exam Result Publishing',
  campus_visit_time: 'Students One-to-One / Campus Visit Time',
  dteam_personal_chats: 'D-Team Personal Chats Cleared',
}

export const TASK_DEADLINES: Partial<Record<TaskKey, string>> = {
  quote_of_day: '9:00 AM',
  schedule_posting: '8:00 PM',
}

export interface TaskItem {
  taskKey: string
  taskName: string
  completed: boolean
  omitted: boolean
  note: string | null
  completedAt: string | null
}

export type TaskLogStatus = 'submitted' | 'verified' | 'flagged' | 'auto_closed'

export interface ITaskLog {
  _id: string
  mentorId: string
  date: string
  batchId: string
  tasks: TaskItem[]
  status: TaskLogStatus
  verifiedBy: string | null
  verificationNote: string | null
  verifiedAt: string | null
  autoClosedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SubjectCounts {
  physics: number
  chemistry: number
  biology: number
  mathematics: number
  general: number
}

export interface IDoubtLog {
  _id: string
  mentorId: string
  date: string
  month: number
  year: number
  subjects: SubjectCounts
  totalForDay: number
  createdAt: string
  updatedAt: string
}

export type VisitType = 'campus_group' | 'merged_group' | 'one_to_one'
export type VisitStatus = 'scheduled' | 'confirmed' | 'change_requested' | 'completed' | 'missed'

export interface IVisit {
  _id: string
  mentorId: string
  classTeacherId: string
  campus: string
  batchId: string
  visitDate: string
  visitType: VisitType
  month: number
  year: number
  status: VisitStatus
  mentorChangeReason: string | null
  ctRemark: string | null
  mentorReportSubmitted: boolean
  ctReviewSubmitted: boolean
  countedForPayment: boolean
  createdAt: string
  updatedAt: string
}

export interface IMentorVisitReport {
  _id: string
  visitId: string
  mentorId: string
  visitDate: string
  campus: string
  batchName: string
  visitType: VisitType
  numberOfStudentsMet: number
  discussionTopics: string
  directiveCovered: boolean
  studentObservations: string
  followUpRequired: boolean
  followUpDetails: string | null
  submittedAt: string
  createdAt: string
}

export type DirectiveCoveredStatus = 'yes' | 'partially' | 'no'
export type RecommendedAction = 'none' | 'needs_followup' | 'escalate_admin'

export interface ICTVisitReview {
  _id: string
  visitId: string
  classTeacherId: string
  mentorId: string
  visitDate: string
  wasPunctual: boolean
  interactionQuality: number
  interactionComments: string
  directiveCovered: DirectiveCoveredStatus
  overallEffectiveness: number
  observations: string
  recommendedAction: RecommendedAction
  submittedAt: string
  createdAt: string
}

export type DirectiveScope = 'all' | 'region' | 'campus' | 'individual' | 'regional_head'

export interface IDirective {
  _id: string
  title: string
  content: string
  publishedBy: string
  targetScope: DirectiveScope
  targetRegion: string | null
  targetCampus: string | null
  targetMentorId: string | null
  month: number
  year: number
  expiresAt: string
  isActive: boolean
  publishedAt: string
  updatedAt: string
}

export interface INotification {
  _id: string
  recipientId: string
  type: string
  message: string
  relatedId: string | null
  isRead: boolean
  createdAt: string
}

export interface PaymentBreakdown {
  mentorId: string
  mentorName: string
  mentorType: 'offline' | 'online'
  month: number
  year: number
  basicPay: number
  dteamPay: number
  doubtWebBase: number
  doubtWebExtra: number
  travelAllowance: number
  meetingPay: number
  total: number
  details: {
    completedVisits: number
    totalDoubts: number
    extraDoubts: number
    taskVerified: boolean
    meetingAttended: boolean
  }
}

export interface JWTPayload {
  userId: string
  role: Role
}

export interface AuthState {
  userId: string | null
  role: Role | null
  name: string | null
  username: string | null
  isAuthenticated: boolean
}

export interface NotificationState {
  items: INotification[]
  unreadCount: number
}

export interface UIState {
  sidebarOpen: boolean
  isLoading: boolean
}

export type MessageType = 'text' | 'image' | 'voice'

export interface IMessage {
  _id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: string
  type: MessageType
  content: string | null
  fileUrl: string | null
  fileName: string | null
  duration: number | null
  readBy: string[]
  createdAt: string
}

export interface IConversation {
  _id: string
  partner: { _id: string; name: string; role: string } | null
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
}
