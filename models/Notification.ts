import mongoose, { Schema, Document, Model } from 'mongoose'

export interface INotificationDocument extends Document {
  recipientId: mongoose.Types.ObjectId
  type: string
  message: string
  relatedId: mongoose.Types.ObjectId | null
  isRead: boolean
  createdAt: Date
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    relatedId: { type: Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

notificationSchema.index({ recipientId: 1, isRead: 1 })
notificationSchema.index({ createdAt: -1 })

const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>('Notification', notificationSchema)

export default Notification
