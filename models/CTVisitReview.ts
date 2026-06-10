import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICTVisitReviewDocument extends Document {
  visitId: mongoose.Types.ObjectId
  classTeacherId: mongoose.Types.ObjectId
  mentorId: mongoose.Types.ObjectId
  visitDate: Date
  wasPunctual: boolean
  interactionQuality: number
  interactionComments: string
  directiveCovered: 'yes' | 'partially' | 'no'
  overallEffectiveness: number
  observations: string
  recommendedAction: 'none' | 'needs_followup' | 'escalate_admin'
  submittedAt: Date
  createdAt: Date
}

const ctVisitReviewSchema = new Schema<ICTVisitReviewDocument>(
  {
    visitId: { type: Schema.Types.ObjectId, ref: 'Visit', required: true, unique: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visitDate: { type: Date, required: true },
    wasPunctual: { type: Boolean, required: true },
    interactionQuality: { type: Number, required: true, min: 1, max: 5 },
    interactionComments: { type: String, required: true },
    directiveCovered: { type: String, enum: ['yes', 'partially', 'no'], required: true },
    overallEffectiveness: { type: Number, required: true, min: 1, max: 5 },
    observations: { type: String, required: true },
    recommendedAction: {
      type: String,
      enum: ['none', 'needs_followup', 'escalate_admin'],
      default: 'none',
    },
    submittedAt: { type: Date, required: true },
  },
  { timestamps: true }
)

ctVisitReviewSchema.index({ visitId: 1 })
ctVisitReviewSchema.index({ mentorId: 1 })
ctVisitReviewSchema.index({ classTeacherId: 1 })

const CTVisitReview: Model<ICTVisitReviewDocument> =
  mongoose.models.CTVisitReview ||
  mongoose.model<ICTVisitReviewDocument>('CTVisitReview', ctVisitReviewSchema)

export default CTVisitReview
