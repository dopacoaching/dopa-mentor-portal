import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITaskItem {
  taskKey: string
  taskName: string
  completed: boolean
  omitted: boolean
  note: string | null
  completedAt: Date | null
}

export interface ITaskLogDocument extends Document {
  mentorId: mongoose.Types.ObjectId
  date: Date
  batchId: string
  tasks: ITaskItem[]
  status: 'submitted' | 'verified' | 'flagged' | 'auto_closed'
  verifiedBy: mongoose.Types.ObjectId | null
  verificationNote: string | null
  verifiedAt: Date | null
  autoClosedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const taskItemSchema = new Schema<ITaskItem>(
  {
    taskKey: { type: String, required: true },
    taskName: { type: String, required: true },
    completed: { type: Boolean, default: false },
    omitted: { type: Boolean, default: false },
    note: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
)

const taskLogSchema = new Schema<ITaskLogDocument>(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    batchId: { type: String, required: true },
    tasks: { type: [taskItemSchema], required: true },
    status: {
      type: String,
      enum: ['submitted', 'verified', 'flagged', 'auto_closed'],
      default: 'submitted',
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verificationNote: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    autoClosedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

taskLogSchema.index({ mentorId: 1, date: -1 })
taskLogSchema.index({ status: 1 })
taskLogSchema.index({ date: -1 })

const TaskLog: Model<ITaskLogDocument> =
  mongoose.models.TaskLog || mongoose.model<ITaskLogDocument>('TaskLog', taskLogSchema)

export default TaskLog
