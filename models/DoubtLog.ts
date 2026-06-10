import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDoubtLogDocument extends Document {
  mentorId: mongoose.Types.ObjectId
  date: Date
  month: number
  year: number
  subjects: {
    physics: number
    chemistry: number
    biology: number
    mathematics: number
    general: number
  }
  totalForDay: number
  createdAt: Date
  updatedAt: Date
}

const doubtLogSchema = new Schema<IDoubtLogDocument>(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    subjects: {
      physics: { type: Number, default: 0, min: 0 },
      chemistry: { type: Number, default: 0, min: 0 },
      biology: { type: Number, default: 0, min: 0 },
      mathematics: { type: Number, default: 0, min: 0 },
      general: { type: Number, default: 0, min: 0 },
    },
    totalForDay: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

doubtLogSchema.index({ mentorId: 1, date: -1 })
doubtLogSchema.index({ mentorId: 1, month: 1, year: 1 })

const DoubtLog: Model<IDoubtLogDocument> =
  mongoose.models.DoubtLog || mongoose.model<IDoubtLogDocument>('DoubtLog', doubtLogSchema)

export default DoubtLog
