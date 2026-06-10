'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { ITaskLog, IUser } from '@/types'

type PopulatedLog = ITaskLog & { mentorId: IUser }

export default function VerifyTasksPage() {
  const [logs, setLogs] = useState<PopulatedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [flagDialog, setFlagDialog] = useState<{ logId: string; open: boolean }>({ logId: '', open: false })
  const [flagNote, setFlagNote] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    const now = new Date()
    const r = await fetch(`/api/tasks?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
    const d = await r.json()
    setLogs(d.logs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function handleVerify(logId: string) {
    setActionLoading(logId)
    try {
      const r = await fetch('/api/tasks/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, action: 'verified' }),
      })
      if (r.ok) { toast.success('Tasks verified'); await fetchLogs() }
      else { const d = await r.json(); toast.error(d.error) }
    } finally { setActionLoading(null) }
  }

  async function handleFlag(logId: string) {
    setActionLoading(logId)
    try {
      const r = await fetch('/api/tasks/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, action: 'flagged', note: flagNote }),
      })
      if (r.ok) { toast.success('Tasks flagged'); setFlagDialog({ logId: '', open: false }); setFlagNote(''); await fetchLogs() }
      else { const d = await r.json(); toast.error(d.error) }
    } finally { setActionLoading(null) }
  }

  const pending = logs.filter((l) => l.status === 'submitted')
  const verified = logs.filter((l) => l.status === 'verified')
  const flagged = logs.filter((l) => l.status === 'flagged')

  function LogCard({ log, showActions }: { log: PopulatedLog; showActions?: boolean }) {
    const isOpen = expanded === log._id
    const completed = log.tasks.filter((t) => t.completed).length
    const hoursSince = Math.round((Date.now() - new Date(log.createdAt).getTime()) / 3600000)
    return (
      <div className="border rounded-xl overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => setExpanded(isOpen ? null : log._id)}
        >
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            <div>
              <p className="font-medium text-sm">{log.mentorId?.name ?? 'Unknown'}</p>
              <p className="text-xs text-gray-400">{formatDate(log.date)} · Batch: {log.batchId} · {completed}/9 done</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showActions && <Badge variant="warning">{hoursSince}h ago</Badge>}
            {log.status === 'verified' && <Badge variant="success">Verified</Badge>}
            {log.status === 'flagged' && <Badge variant="destructive">Flagged</Badge>}
            {log.status === 'auto_closed' && <Badge variant="secondary">Auto-closed</Badge>}
          </div>
        </div>
        {isOpen && (
          <div className="border-t px-4 pb-4 pt-3 space-y-2">
            {log.tasks.map((t) => (
              <div key={t.taskKey} className="flex items-start gap-2.5 text-sm">
                {t.completed
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />}
                <div>
                  <span className={t.completed ? 'text-gray-800' : 'text-gray-400'}>{t.taskName}</span>
                  {t.note && <p className="text-xs text-gray-500 mt-0.5">{t.note}</p>}
                </div>
              </div>
            ))}
            {log.verificationNote && (
              <div className="mt-2 p-2.5 bg-orange-50 rounded text-xs text-orange-700">
                <strong>Note:</strong> {log.verificationNote}
              </div>
            )}
            {showActions && log.status === 'submitted' && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleVerify(log._id)}
                  disabled={actionLoading === log._id}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Verify All
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { setFlagDialog({ logId: log._id, open: true }); setFlagNote('') }}
                  disabled={actionLoading === log._id}
                  className="flex-1"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Flag
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Task Verification</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending <Badge variant="warning" className="ml-1.5">{pending.length}</Badge></TabsTrigger>
          <TabsTrigger value="verified">Verified <Badge variant="success" className="ml-1.5">{verified.length}</Badge></TabsTrigger>
          <TabsTrigger value="flagged">Flagged <Badge variant="destructive" className="ml-1.5">{flagged.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)
          ) : pending.length === 0 ? (
            <div className="text-center py-12 text-gray-400">All caught up — no pending verifications!</div>
          ) : (
            pending.map((log) => <LogCard key={log._id} log={log} showActions />)
          )}
        </TabsContent>

        <TabsContent value="verified" className="mt-4 space-y-3">
          {verified.length === 0
            ? <div className="text-center py-12 text-gray-400">No verified logs this month</div>
            : verified.map((log) => <LogCard key={log._id} log={log} />)}
        </TabsContent>

        <TabsContent value="flagged" className="mt-4 space-y-3">
          {flagged.length === 0
            ? <div className="text-center py-12 text-gray-400">No flagged logs this month</div>
            : flagged.map((log) => <LogCard key={log._id} log={log} />)}
        </TabsContent>
      </Tabs>

      <Dialog open={flagDialog.open} onOpenChange={(o) => setFlagDialog((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Flag Task Log</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Please provide a reason for flagging this submission:</p>
            <Textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="Explain what was missing or incorrect..."
              className="h-28"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialog({ logId: '', open: false })}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!flagNote.trim() || actionLoading === flagDialog.logId}
              onClick={() => handleFlag(flagDialog.logId)}
            >
              Flag Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
