'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { ITaskLog, IUser } from '@/types'

type PopulatedLog = Omit<ITaskLog, 'mentorId'> & { mentorId: IUser }

const STATUS_BADGE: Record<string, JSX.Element> = {
  submitted: <Badge variant="warning">Pending</Badge>,
  verified: <Badge variant="success">Verified</Badge>,
  flagged: <Badge variant="destructive">Flagged</Badge>,
  auto_closed: <Badge variant="secondary">Auto-closed</Badge>,
}

export default function CTTasksPage() {
  const [logs, setLogs] = useState<PopulatedLog[]>([])
  const [mentors, setMentors] = useState<IUser[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterMentor, setFilterMentor] = useState('all')

  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [logsRes, mentorRes] = await Promise.all([
        fetch(`/api/tasks?month=${month}&year=${year}`),
        fetch('/api/users?role=mentor'),
      ])
      const [logsData, mentorData] = await Promise.all([logsRes.json(), mentorRes.json()])
      setLogs(logsData.logs ?? [])
      setMentors(mentorData.users ?? [])
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = filterMentor === 'all'
    ? logs
    : logs.filter((l) => l.mentorId._id === filterMentor)

  const mentorsWithLogs = mentors.filter((m) =>
    logs.some((l) => l.mentorId._id === m._id)
  )

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mentor Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {now.toLocaleString('default', { month: 'long', year: 'numeric' })} · {logs.length} logs
          </p>
        </div>
        {mentorsWithLogs.length > 1 && (
          <Select value={filterMentor} onValueChange={setFilterMentor}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All mentors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All mentors</SelectItem>
              {mentorsWithLogs.map((m) => (
                <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No task logs this month</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => {
            const isOpen = expanded === log._id
            const completed = log.tasks.filter((t) => t.completed).length
            const mentor = log.mentorId
            return (
              <div key={log._id} className="border dark:border-slate-700 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 select-none"
                  onClick={() => setExpanded(isOpen ? null : log._id)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />}
                    <div>
                      <p className="font-medium text-sm">{mentor?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {formatDate(log.date)} · Batch: {log.batchId} · {completed}/9 done
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      completed === 9
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : completed > 0
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {completed}/9
                    </span>
                    {STATUS_BADGE[log.status]}
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t dark:border-slate-700 px-4 pb-4 pt-3 space-y-2">
                    {log.tasks.map((t) => (
                      <div key={t.taskKey} className="flex items-start gap-2.5 text-sm">
                        {t.completed
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          : <Circle className="w-4 h-4 text-gray-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />}
                        <div>
                          <span className={t.completed ? 'text-gray-800 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'}>
                            {t.taskName}
                          </span>
                          {t.note && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.note}</p>}
                        </div>
                      </div>
                    ))}
                    {log.verificationNote && (
                      <div className="mt-2 p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-700 dark:text-orange-300">
                        <strong>Verification note:</strong> {log.verificationNote}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
