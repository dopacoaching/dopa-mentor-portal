import mongoose, { Schema, Document, Model } from 'mongoose'

export interface CampusBatch {
  batchId: string
  batchName: string
  batchType: 'residential' | 'online' | 'ig'
}

export interface ICampusDocument extends Document {
  name: string
  region: 'calicut' | 'kottakkal' | 'thrissur' | 'ig'
  batches: CampusBatch[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const campusBatchSchema = new Schema<CampusBatch>(
  {
    batchId: { type: String, required: true },
    batchName: { type: String, required: true, trim: true },
    batchType: { type: String, enum: ['residential', 'online', 'ig'], required: true },
  },
  { _id: false }
)

const campusSchema = new Schema<ICampusDocument>(
  {
    name: { type: String, required: true, trim: true },
    region: { type: String, enum: ['calicut', 'kottakkal', 'thrissur', 'ig'], required: true },
    batches: { type: [campusBatchSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

campusSchema.index({ region: 1 })
campusSchema.index({ name: 1, region: 1 }, { unique: true })

const Campus: Model<ICampusDocument> =
  mongoose.models.Campus || mongoose.model<ICampusDocument>('Campus', campusSchema)

export default Campus
