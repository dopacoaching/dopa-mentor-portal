import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDirectiveDocument extends Document {
  title: string
  content: string
  publishedBy: mongoose.Types.ObjectId
  targetScope: 'all' | 'region' | 'campus' | 'individual'
  targetRegion: string | null
  targetCampus: string | null
  targetMentorId: mongoose.Types.ObjectId | null
  month: number
  year: number
  expiresAt: Date
  isActive: boolean
  publishedAt: Date
  updatedAt: Date
}

const directiveSchema = new Schema<IDirectiveDocument>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetScope: { type: String, enum: ['all', 'region', 'campus', 'individual'], required: true },
    targetRegion: { type: String, default: null },
    targetCampus: { type: String, default: null },
    targetMentorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    publishedAt: { type: Date, required: true },
  },
  { timestamps: true }
)

directiveSchema.index({ month: 1, year: 1 })
directiveSchema.index({ isActive: 1 })
directiveSchema.index({ targetScope: 1 })

const Directive: Model<IDirectiveDocument> =
  mongoose.models.Directive || mongoose.model<IDirectiveDocument>('Directive', directiveSchema)

export default Directive
