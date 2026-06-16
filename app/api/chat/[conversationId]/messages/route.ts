import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { getMessages, sendMessage } from '@/lib/services/chat.service'

// GET /api/chat/[conversationId]/messages — fetch messages (paginated)
export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const user = authenticate(request)
    const { searchParams } = new URL(request.url)
    const before = searchParams.get('before')
    const limit = Number(searchParams.get('limit') ?? 40)
    const messages = await getMessages(user, params.conversationId, before, limit)
    return NextResponse.json({ messages })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/chat/[conversationId]/messages — send a text/image/voice message
export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const user = authenticate(request)
    const body = await request.json()
    const message = await sendMessage(user, params.conversationId, body)
    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
