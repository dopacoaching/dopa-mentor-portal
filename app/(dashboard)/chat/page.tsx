'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, Image as ImageIcon, Mic, StopCircle, X, Search, MessageSquare, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/store/hooks'
import { roleLabel, formatRelativeTime } from '@/lib/utils'
import type { IMessage, IConversation } from '@/types'

// ─── Audio Player ─────────────────────────────────────────────────────────────
function VoicePlayer({ url, duration }: { url: string; duration: number | null }) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => { setPlaying(false); setElapsed(0) }
      audioRef.current.ontimeupdate = () => setElapsed(Math.floor(audioRef.current!.currentTime))
    }
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const total = duration ? Math.ceil(duration) : 0

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all"
            style={{ width: total > 0 ? `${(elapsed / total) * 100}%` : '0%' }}
          />
        </div>
        <p className="text-xs mt-0.5 opacity-70">{fmt(elapsed)}{total > 0 && ` / ${fmt(total)}`}</p>
      </div>
    </div>
  )
}

// ─── Bubble ────────────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine }: { msg: IMessage; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm
        ${isMine
          ? 'bg-dopa-green text-white rounded-br-sm'
          : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-bl-sm'
        }`}>
        {!isMine && (
          <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</p>
        )}
        {msg.type === 'text' && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
        {msg.type === 'image' && (
          <a href={msg.fileUrl!} target="_blank" rel="noreferrer">
            <img src={msg.fileUrl!} alt={msg.fileName ?? 'image'} className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer" />
          </a>
        )}
        {msg.type === 'voice' && (
          <VoicePlayer url={msg.fileUrl!} duration={msg.duration} />
        )}
        <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-gray-400 dark:text-slate-500'} text-right`}>
          {formatRelativeTime(msg.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ─── Contact list item ─────────────────────────────────────────────────────────
interface ContactItem { _id: string; name: string; role: string }

function ContactRow({ contact, active, onSelect }: { contact: ContactItem; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors
        ${active ? 'bg-dopa-light dark:bg-slate-800 border-r-2 border-dopa-green' : ''}`}
    >
      <div className="w-10 h-10 rounded-full bg-dopa-green flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">{contact.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{contact.name}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">{roleLabel(contact.role)}</p>
      </div>
    </button>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { userId, role } = useAppSelector((s) => s.auth)

  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [convMap, setConvMap] = useState<Record<string, IConversation>>({})
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<IMessage[]>([])
  const [text, setText] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioChunks = useRef<Blob[]>([])

  // Load contacts (who this user can chat with)
  useEffect(() => {
    if (!userId || !role) return
    const url = role === 'admin' ? '/api/users?active=true' : '/api/users?role=admin&active=true'
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const all = (d.users ?? []) as { _id: string; name: string; role: string }[]
        setContacts(all.filter((u) => u._id !== userId))
      })
      .catch(() => {})
  }, [userId, role])

  // Load conversations
  const loadConversations = useCallback(async () => {
    const r = await fetch('/api/chat/conversations')
    const d = await r.json()
    const map: Record<string, IConversation> = {}
    for (const c of d.conversations ?? []) {
      if (c.partner) map[c.partner._id] = c
    }
    setConvMap(map)
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Listen for incoming chat messages via SSE
  useEffect(() => {
    const handleSSE = (e: Event) => {
      const ev = e as MessageEvent
      try {
        const data = JSON.parse(ev.data)
        if (data.conversationId === activeConvId) {
          setMessages((prev) => [...prev, data.message])
        }
        loadConversations()
      } catch {}
    }
    window.addEventListener('chat_message', handleSSE)
    return () => window.removeEventListener('chat_message', handleSSE)
  }, [activeConvId, loadConversations])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConversation(contact: ContactItem) {
    // Get or create conversation
    const r = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: contact._id }),
    })
    const d = await r.json()
    if (!r.ok) { toast.error(d.error); return }
    const convId = d.conversation._id
    setActiveConvId(convId)
    // Fetch messages
    const mr = await fetch(`/api/chat/${convId}/messages`)
    const md = await mr.json()
    setMessages(md.messages ?? [])
    loadConversations()
  }

  async function sendText() {
    if (!text.trim() || !activeConvId || sending) return
    setSending(true)
    try {
      const r = await fetch(`/api/chat/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content: text.trim() }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      setMessages((prev) => [...prev, d.message])
      setText('')
      loadConversations()
    } finally { setSending(false) }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeConvId) return
    e.target.value = ''
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const ur = await fetch('/api/chat/upload', { method: 'POST', body: form })
      const ud = await ur.json()
      if (!ur.ok) { toast.error(ud.error); return }
      const r = await fetch(`/api/chat/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'image', fileUrl: ud.url, fileName: file.name }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      setMessages((prev) => [...prev, d.message])
      loadConversations()
    } finally { setUploading(false) }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunks.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (!activeConvId) return
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        setUploading(true)
        try {
          const form = new FormData()
          form.append('file', blob, 'voice.webm')
          const ur = await fetch('/api/chat/upload', { method: 'POST', body: form })
          const ud = await ur.json()
          if (!ur.ok) { toast.error(ud.error); return }
          const r = await fetch(`/api/chat/${activeConvId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'voice', fileUrl: ud.url, duration: ud.duration }),
          })
          const d = await r.json()
          if (r.ok) { setMessages((prev) => [...prev, d.message]); loadConversations() }
        } finally { setUploading(false) }
      }
      mr.start()
      setMediaRecorder(mr)
      setRecording(true)
    } catch {
      toast.error('Microphone permission denied')
    }
  }

  function stopRecording() {
    mediaRecorder?.stop()
    setMediaRecorder(null)
    setRecording(false)
  }

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase())
  )

  // Find active partner name
  const activePartnerContact = contacts.find((c) => {
    const conv = convMap[c._id]
    return conv?._id === activeConvId
  })

  return (
    <div className="flex h-[calc(100vh-56px-2rem)] rounded-xl overflow-hidden border dark:border-slate-700 bg-white dark:bg-slate-900">
      {/* Left: Contact list */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r dark:border-slate-700">
        <div className="px-4 py-3 border-b dark:border-slate-700">
          <h2 className="font-bold text-base mb-2">Messages</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search contacts…"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">No contacts</p>
          ) : (
            filteredContacts.map((contact) => {
              const conv = convMap[contact._id]
              return (
                <div key={contact._id} className="relative">
                  <ContactRow
                    contact={contact}
                    active={conv?._id === activeConvId}
                    onSelect={() => openConversation(contact)}
                  />
                  {conv?.unread > 0 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-dopa-green text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {conv.unread > 9 ? '9+' : conv.unread}
                    </span>
                  )}
                  {conv?.lastMessage && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 px-4 pb-2 -mt-1 truncate">
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Chat thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
            <MessageSquare className="w-12 h-12 opacity-20 mb-3" />
            <p>Select a contact to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-14 px-4 flex items-center gap-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              {activePartnerContact && (
                <>
                  <div className="w-8 h-8 rounded-full bg-dopa-green flex items-center justify-center">
                    <span className="text-white font-bold text-xs">{activePartnerContact.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{activePartnerContact.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{roleLabel(activePartnerContact.role)}</p>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50 dark:bg-slate-950">
              {messages.length === 0 && (
                <div className="text-center py-12 text-gray-400 dark:text-slate-600 text-sm">
                  No messages yet. Say hi!
                </div>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg._id} msg={msg} isMine={msg.senderId === userId} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t dark:border-slate-700 bg-white dark:bg-slate-900">
              {uploading && (
                <div className="mb-2 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                  <div className="w-3 h-3 border-2 border-dopa-green border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </div>
              )}
              {recording && (
                <div className="mb-2 flex items-center gap-2 text-xs text-red-500 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Recording… tap stop when done
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || recording}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-40 transition-colors"
                  title="Send image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={uploading}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-40
                    ${recording
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                    }`}
                  title={recording ? 'Stop recording' : 'Record voice message'}
                >
                  {recording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <Input
                  className="flex-1 h-9 text-sm"
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                  disabled={recording || uploading}
                />
                <Button
                  size="sm"
                  onClick={sendText}
                  disabled={!text.trim() || sending || recording || uploading}
                  className="h-9 px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
