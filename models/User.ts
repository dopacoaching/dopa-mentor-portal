import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUserDocument extends Document {
  name: string
  username: string
  password: string
  role: 'admin' | 'class_teacher' | 'mentor' | 'regional_head'
  isActive: boolean
  region: 'Calicut' | 'Kottakkal' | 'Thrissur' | 'IG' | null
  campus: string | null
  assignedBatches: {
    batchId: string
    batchType: 'residential' | 'online' | 'ig' | 'offline'
    batchName: string
  }[]
  assignedMentors: mongoose.Types.ObjectId[]
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const assignedBatchSchema = new Schema(
  {
    batchId: { type: String, required: true },
    batchType: { type: String, enum: ['residential', 'online', 'ig', 'offline'], required: true },
    batchName: { type: String, required: true },
  },
  { _id: false }
)

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'class_teacher', 'mentor', 'regional_head'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    region: {
      type: String,
      enum: ['Calicut', 'Kottakkal', 'Thrissur', 'IG', null],
      default: null,
    },
    campus: { type: String, default: null },
    assignedBatches: { type: [assignedBatchSchema], default: [] },
    assignedMentors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

userSchema.index({ role: 1 })
userSchema.index({ region: 1 })
userSchema.index({ campus: 1 })

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema)

export default User
