import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IVisitDocument extends Document {
  mentorId: mongoose.Types.ObjectId
  classTeacherId: mongoose.Types.ObjectId
  campus: string
  batchId: string
  visitDate: Date
  visitType: 'campus_group' | 'merged_group' | 'one_to_one'
  month: number
  year: number
  status: 'scheduled' | 'confirmed' | 'change_requested' | 'completed' | 'missed'
  mentorChangeReason: string | null
  ctRemark: string | null
  mentorReportSubmitted: boolean
  ctReviewSubmitted: boolean
  countedForPayment: boolean
  createdAt: Date
  updatedAt: Date
}

const visitSchema = new Schema<IVisitDocument>(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    campus: { type: String, required: true },
    batchId: { type: String, required: true },
    visitDate: { type: Date, required: true },
    visitType: { type: String, enum: ['campus_group', 'merged_group', 'one_to_one'], required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'change_requested', 'completed', 'missed'],
      default: 'scheduled',
    },
    mentorChangeReason: { type: String, default: null },
    ctRemark: { type: String, default: null },
    mentorReportSubmitted: { type: Boolean, default: false },
    ctReviewSubmitted: { type: Boolean, default: false },
    countedForPayment: { type: Boolean, default: false },
  },
  { timestamps: true }
)

visitSchema.index({ mentorId: 1, month: 1, year: 1 })
visitSchema.index({ classTeacherId: 1 })
visitSchema.index({ status: 1 })
visitSchema.index({ visitDate: 1 })

const Visit: Model<IVisitDocument> =
  mongoose.models.Visit || mongoose.model<IVisitDocument>('Visit', visitSchema)

export default Visit
