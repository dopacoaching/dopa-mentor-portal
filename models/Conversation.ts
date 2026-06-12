import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IConversationDocument extends Document {
  participants: mongoose.Types.ObjectId[]
  lastMessage: string | null
  lastMessageAt: Date | null
  unreadCounts: Map<string, number>
  createdAt: Date
  updatedAt: Date
}

const conversationSchema = new Schema<IConversationDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
)

conversationSchema.index({ participants: 1 })
conversationSchema.index({ lastMessageAt: -1 })

const Conversation: Model<IConversationDocument> =
  mongoose.models.Conversation || mongoose.model<IConversationDocument>('Conversation', conversationSchema)

export default Conversation
