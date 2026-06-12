import mongoose, { Schema, Document, Model } from 'mongoose'

export type MessageType = 'text' | 'image' | 'voice'

export interface IMessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  senderName: string
  senderRole: string
  type: MessageType
  content: string | null
  fileUrl: string | null
  fileName: string | null
  duration: number | null
  readBy: mongoose.Types.ObjectId[]
  createdAt: Date
}

const messageSchema = new Schema<IMessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'voice'], required: true },
    content: { type: String, default: null },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    duration: { type: Number, default: null },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ senderId: 1 })

const Message: Model<IMessageDocument> =
  mongoose.models.Message || mongoose.model<IMessageDocument>('Message', messageSchema)

export default Message
