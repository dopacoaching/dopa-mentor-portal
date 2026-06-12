import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { requireAuth, isAuthResult } from '@/lib/middleware'
import User from '@/models/User'
import Conversation from '@/models/Conversation'
import mongoose from 'mongoose'

// GET /api/chat/conversations — list this user's conversations with partner info
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const myId = new mongoose.Types.ObjectId(user.userId)

  const conversations = await Conversation.find({ participants: myId })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .lean()

  // Collect all unique partner IDs
  const partnerIds = conversations.flatMap((c) =>
    c.participants.filter((p) => p.toString() !== user.userId)
  )
  const uniquePartnerIds = [...new Set(partnerIds.map((p) => p.toString()))]
  const partners = await User.find({ _id: { $in: uniquePartnerIds } }).select('name role').lean()
  const partnerMap = Object.fromEntries(partners.map((p) => [p._id.toString(), p]))

  const result = conversations.map((c) => {
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

  return NextResponse.json({ conversations: result })
}

// POST /api/chat/conversations — create or return existing conversation with a user
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  await connectDB()
  const { user } = authResult
  const { partnerId } = await request.json()
  if (!partnerId) return NextResponse.json({ error: 'partnerId required' }, { status: 400 })

  const partner = await User.findById(partnerId).select('name role isActive').lean()
  if (!partner || !partner.isActive) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const myId = new mongoose.Types.ObjectId(user.userId)
  const theirId = new mongoose.Types.ObjectId(partnerId)

  // Find existing conversation between these two
  let conversation = await Conversation.findOne({
    participants: { $all: [myId, theirId], $size: 2 },
  })

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [myId, theirId],
      unreadCounts: {},
    })
  }

  return NextResponse.json({ conversation })
}
