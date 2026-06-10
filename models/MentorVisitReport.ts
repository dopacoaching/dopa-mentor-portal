import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IMentorVisitReportDocument extends Document {
  visitId: mongoose.Types.ObjectId
  mentorId: mongoose.Types.ObjectId
  visitDate: Date
  campus: string
  batchName: string
  visitType: 'campus_group' | 'merged_group' | 'one_to_one'
  numberOfStudentsMet: number
  discussionTopics: string
  directiveCovered: boolean
  studentObservations: string
  followUpRequired: boolean
  followUpDetails: string | null
  submittedAt: Date
  createdAt: Date
}

const mentorVisitReportSchema = new Schema<IMentorVisitReportDocument>(
  {
    visitId: { type: Schema.Types.ObjectId, ref: 'Visit', required: true, unique: true },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visitDate: { type: Date, required: true },
    campus: { type: String, required: true },
    batchName: { type: String, required: true },
    visitType: { type: String, enum: ['campus_group', 'merged_group', 'one_to_one'], required: true },
    numberOfStudentsMet: { type: Number, required: true, min: 0 },
    discussionTopics: { type: String, required: true },
    directiveCovered: { type: Boolean, required: true },
    studentObservations: { type: String, required: true },
    followUpRequired: { type: Boolean, default: false },
    followUpDetails: { type: String, default: null },
    submittedAt: { type: Date, required: true },
  },
  { timestamps: true }
)

mentorVisitReportSchema.index({ visitId: 1 })
mentorVisitReportSchema.index({ mentorId: 1 })

const MentorVisitReport: Model<IMentorVisitReportDocument> =
  mongoose.models.MentorVisitReport ||
  mongoose.model<IMentorVisitReportDocument>('MentorVisitReport', mentorVisitReportSchema)

export default MentorVisitReport
