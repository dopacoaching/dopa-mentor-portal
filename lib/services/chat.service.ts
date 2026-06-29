import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Conversation from '@/models/Conversation'
import Message from '@/models/Message'
import { ApiError } from '@/lib/api/errors'
import type { JWTPayload } from '@/types'

/** This user's conversations with partner info and unread counts. */
export async function listConversations(user: JWTPayload) {
  await connectDB()
  const myId = new mongoose.Types.ObjectId(user.userId)

  const conversations = await Conversation.find({ participants: myId })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .lean()

  const partnerIds = conversations.flatMap((c) =>
    c.participants.filter((p) => p.toString() !== user.userId)
  )
  const uniquePartnerIds = [...new Set(partnerIds.map((p) => p.toString()))]
  const partners = await User.find({ _id: { $in: uniquePartnerIds } }).select('name role').lean()
  const partnerMap = Object.fromEntries(partners.map((p) => [p._id.toString(), p]))

  return conversations.map((c) => {
    const partnerId = c.participants.find((p) => p.toString() !== user.userId)?.toString()
    const partner = partnerId ? partnerMap[partnerId] : null
    return {
      _id: c._id,
      partner: partner ?? null,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unread: (c.unreadCounts as unknown as Record<string, number>)[user.userId] ?? 0,
    }
  })
}

/** Returns (or creates) the 1:1 conversation between this user and a partner. */
export async function getOrCreateConversation(user: JWTPayload, partnerId?: string) {
  await connectDB()
  if (!partnerId) throw ApiError.badRequest('partnerId required')

  const partner = await User.findById(partnerId).select('name role isActive').lean()
  if (!partner || !partner.isActive) throw ApiError.notFound('User not found')

  // Conversations must include an admin: non-admins can only chat with admins.
  if (user.role !== 'admin' && partner.role !== 'admin') {
    throw ApiError.forbidden('You can only chat with administrators')
  }

  const myId = new mongoose.Types.ObjectId(user.userId)
  const theirId = new mongoose.Types.ObjectId(partnerId)

  let conversation = await Conversation.findOne({
    participants: { $all: [myId, theirId], $size: 2 },
  })

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [myId, theirId],
      unreadCounts: {},
    })
  }

  return conversation
}

/** Verifies membership, returns oldest→newest page of messages, marks them read. */
export async function getMessages(
  user: JWTPayload,
  conversationId: string,
  before: string | null,
  limitParam: number
) {
  await connectDB()
  const myId = new mongoose.Types.ObjectId(user.userId)

  const conversation = await Conversation.findOne({ _id: conversationId, participants: myId })
  if (!conversation) throw ApiError.notFound('Conversation not found')

  const limit = Math.min(50, limitParam)
  const query: Record<string, unknown> = { conversationId }
  if (before) query.createdAt = { $lt: new Date(before) }

  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit).lean()

  await Message.updateMany(
    { conversationId, readBy: { $ne: myId } },
    { $addToSet: { readBy: myId } }
  )
  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { [`unreadCounts.${user.userId}`]: 0 } }
  )

  return messages.reverse()
}

interface SendMessageInput {
  type?: string
  content?: string
  fileUrl?: string
  fileName?: string
  duration?: number
}

/** Sends a text/image/voice message; bumps unread counts and delivers in real-time. */
export async function sendMessage(user: JWTPayload, conversationId: string, body: SendMessageInput) {
  await connectDB()
  const myId = new mongoose.Types.ObjectId(user.userId)

  const conversation = await Conversation.findOne({ _id: conversationId, participants: myId })
  if (!conversation) throw ApiError.notFound('Conversation not found')

  const { type, content, fileUrl, fileName, duration } = body

  if (!type || !['text', 'image', 'voice'].includes(type)) {
    throw ApiError.badRequest('Invalid message type')
  }
  if (type === 'text' && !content?.trim()) {
    throw ApiError.badRequest('Content required for text message')
  }
  if ((type === 'image' || type === 'voice') && !fileUrl) {
    throw ApiError.badRequest('fileUrl required for media message')
  }

  const sender = await User.findById(user.userId).select('name').lean()
  const message = await Message.create({
    conversationId,
    senderId: myId,
    senderName: (sender as { name?: string })?.name ?? 'Unknown',
    senderRole: user.role,
    type,
    content: type === 'text' ? content!.trim() : null,
    fileUrl: fileUrl ?? null,
    fileName: fileName ?? null,
    duration: duration ?? null,
    readBy: [myId],
  })

  const preview = type === 'text' ? content!.trim() : type === 'image' ? '📷 Image' : '🎤 Voice message'
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: { lastMessage: preview, lastMessageAt: new Date() },
      $inc: Object.fromEntries(
        conversation.participants
          .filter((p) => p.toString() !== user.userId)
          .map((p) => [`unreadCounts.${p.toString()}`, 1])
      ),
    }
  )

  const msgObj = message.toObject()

  return msgObj
}
