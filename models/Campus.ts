import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICampusDocument extends Document {
  name: string
  region: 'calicut' | 'kottakkal' | 'thrissur' | 'ig'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const campusSchema = new Schema<ICampusDocument>(
  {
    name: { type: String, required: true, trim: true },
    region: { type: String, enum: ['calicut', 'kottakkal', 'thrissur', 'ig'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

campusSchema.index({ region: 1 })
campusSchema.index({ name: 1, region: 1 }, { unique: true })

const Campus: Model<ICampusDocument> =
  mongoose.models.Campus || mongoose.model<ICampusDocument>('Campus', campusSchema)

export default Campus
