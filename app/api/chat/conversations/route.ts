import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { listConversations, getOrCreateConversation } from '@/lib/services/chat.service'

// GET /api/chat/conversations — list this user's conversations with partner info
export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request)
    const conversations = await listConversations(user)
    return NextResponse.json({ conversations })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/chat/conversations — create or return existing conversation with a user
export async function POST(request: NextRequest) {
  try {
    const user = authenticate(request)
    const { partnerId } = await request.json()
    const conversation = await getOrCreateConversation(user, partnerId)
    return NextResponse.json({ conversation })
  } catch (error) {
    return handleApiError(error)
  }
}
