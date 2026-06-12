import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, isAuthResult } from '@/lib/middleware'
import Conversation from '@/models/Conversation'
import Message from '@/models/Message'
import User from '@/models/User'
import { sendToUser } from '@/lib/sse'
import mongoose from 'mongoose'

// GET /api/chat/[conversationId]/messages — fetch messages (paginated)
export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const myId = new mongoose.Types.ObjectId(user.userId)

  const conversation = await Conversation.findOne({
    _id: params.conversationId,
    participants: myId,
  })
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const before = searchParams.get('before')
  const limit = Math.min(50, Number(searchParams.get('limit') ?? 40))

  const query: Record<string, unknown> = { conversationId: params.conversationId }
  if (before) query.createdAt = { $lt: new Date(before) }

  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit).lean()

  // Mark messages as read
  await Message.updateMany(
    { conversationId: params.conversationId, readBy: { $ne: myId } },
    { $addToSet: { readBy: myId } }
  )

  // Reset unread count
  await Conversation.updateOne(
    { _id: params.conversationId },
    { $set: { [`unreadCounts.${user.userId}`]: 0 } }
  )

  return NextResponse.json({ messages: messages.reverse() })
}

// POST /api/chat/[conversationId]/messages — send a text/image/voice message
export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const myId = new mongoose.Types.ObjectId(user.userId)

  const conversation = await Conversation.findOne({
    _id: params.conversationId,
    participants: myId,
  })
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const body = await request.json()
  const { type, content, fileUrl, fileName, duration } = body

  if (!type || !['text', 'image', 'voice'].includes(type)) {
    return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
  }
  if (type === 'text' && !content?.trim()) {
    return NextResponse.json({ error: 'Content required for text message' }, { status: 400 })
  }
  if ((type === 'image' || type === 'voice') && !fileUrl) {
    return NextResponse.json({ error: 'fileUrl required for media message' }, { status: 400 })
  }

  const sender = await User.findById(user.userId).select('name').lean()
  const message = await Message.create({
    conversationId: params.conversationId,
    senderId: myId,
    senderName: (sender as { name?: string })?.name ?? 'Unknown',
    senderRole: user.role,
    type,
    content: type === 'text' ? content.trim() : null,
    fileUrl: fileUrl ?? null,
    fileName: fileName ?? null,
    duration: duration ?? null,
    readBy: [myId],
  })

  // Update conversation last message
  const preview = type === 'text' ? content.trim() : type === 'image' ? '📷 Image' : '🎤 Voice message'
  await Conversation.updateOne(
    { _id: params.conversationId },
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

  // Deliver real-time to partner(s)
  for (const participantId of conversation.participants) {
    const pid = participantId.toString()
    if (pid !== user.userId) {
      sendToUser(pid, { type: 'chat_message', data: { conversationId: params.conversationId, message: msgObj } })
    }
  }

  return NextResponse.json({ message: msgObj }, { status: 201 })
}
