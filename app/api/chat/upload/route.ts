import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthResult } from '@/lib/middleware'
import { uploadBuffer } from '@/lib/cloudinary'

// POST /api/chat/upload — upload image or voice file to Cloudinary
// Uses native Request.formData() (Next.js App Router compatible, no multer needed)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!isAuthResult(authResult)) return authResult

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const maxBytes = 20 * 1024 * 1024 // 20 MB
  if (file.size > maxBytes) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })

  const isImage = file.type.startsWith('image/')
  const isAudio = file.type.startsWith('audio/')
  if (!isImage && !isAudio) {
    return NextResponse.json({ error: 'Only image and audio files are allowed' }, { status: 415 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const result = await uploadBuffer(buffer, {
      folder: `dopa-chat/${isAudio ? 'voice' : 'images'}`,
      resource_type: isAudio ? 'video' : 'image',
    })

    return NextResponse.json({
      url: result.url,
      fileName: file.name,
      type: isAudio ? 'voice' : 'image',
      duration: result.duration ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
