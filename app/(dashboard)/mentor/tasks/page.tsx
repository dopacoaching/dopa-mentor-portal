'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppSelector } from '@/store/hooks'
import { TASK_KEYS, TASK_NAMES, TASK_DEADLINES } from '@/types'
import type { ITaskLog, TaskItem } from '@/types'
import { formatDate } from '@/lib/utils'

function statusBadge(status: string) {
  switch (status) {
    case 'verified': return <Badge variant="success">Verified</Badge>
    case 'flagged': return <Badge variant="destructive">Flagged</Badge>
    case 'auto_closed': return <Badge variant="secondary">Auto-Closed</Badge>
    default: return <Badge variant="warning">Submitted</Badge>
  }
}

function getDayColor(log: ITaskLog | undefined, date: Date): string {
  if (date > new Date()) return 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
  if (!log) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  const completed = log.tasks.filter((t) => t.completed).length
  if (completed === 9) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
  if (completed > 0) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
}

export default function MentorTasksPage() {
  const { userId } = useAppSelector((s) => s.auth)
  const [todayLog, setTodayLog] = useState<ITaskLog | null>(null)
  const [monthLogs, setMonthLogs] = useState<ITaskLog[]>([])
  const [tasks, setTasks] = useState<Record<string, { completed: boolean; note: string }>>({})
  const [saving, setSaving] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedLog, setSelectedLog] = useState<ITaskLog | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const initTasks = useCallback((log: ITaskLog | null) => {
    const init: Record<string, { completed: boolean; note: string }> = {}
    TASK_KEYS.forEach((key) => {
      const t = log?.tasks.find((x) => x.taskKey === key)
      init[key] = { completed: t?.completed ?? false, note: t?.note ?? '' }
    })
    setTasks(init)
  }, [])

  const fetchToday = useCallback(async () => {
    if (!userId) return
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    const r = await fetch(`/api/tasks/${userId}?month=${m}&year=${y}`)
    const d = await r.json()
    const todayStr = now.toDateString()
    const log = d.logs?.find((l: ITaskLog) => new Date(l.date).toDateString() === todayStr) ?? null
    setTodayLog(log)
    initTasks(log)
    setMonthLogs(d.logs ?? [])
  }, [userId, initTasks])

  const fetchMonth = useCallback(async () => {
    if (!userId) return
    const m = currentMonth.getMonth() + 1
    const y = currentMonth.getFullYear()
    const r = await fetch(`/api/tasks/${userId}?month=${m}&year=${y}`)
    const d = await r.json()
    setMonthLogs(d.logs ?? [])
  }, [userId, currentMonth])

  useEffect(() => { fetchToday() }, [fetchToday])
  useEffect(() => { fetchMonth() }, [fetchMonth])

  function toggleTask(key: string) {
    if (todayLog && todayLog.status !== 'submitted') return
    setTasks((prev) => ({ ...prev, [key]: { ...prev[key], completed: !prev[key]?.completed } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const taskPayload = TASK_KEYS.map((key) => ({
        taskKey: key,
        completed: tasks[key]?.completed ?? false,
        note: tasks[key]?.note || null,
      }))
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: taskPayload }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success('Task report saved!')
      setTodayLog(d.log)
      await fetchMonth()
    } finally {
      setSaving(false)
    }
  }

  const isSubmitted = !!todayLog && todayLog.status !== 'submitted'
  const completedCount = Object.values(tasks).filter((t) => t.completed).length

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  function getLogForDay(day: number): ITaskLog | undefined {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return monthLogs.find((l) => new Date(l.date).toDateString() === d.toDateString())
  }

  const now = new Date()
  const isToday = currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear()

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Daily Tasks</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today's Checklist</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-slate-400">{completedCount}/9 completed</span>
              {todayLog && statusBadge(todayLog.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {TASK_KEYS.map((key) => {
            const t = tasks[key] ?? { completed: false, note: '' }
            const deadline = TASK_DEADLINES[key]
            const deadlinePassed = deadline === '9:00 AM' ? new Date().getHours() >= 9 : new Date().getHours() >= 20
            return (
              <div key={key} className={`border rounded-xl p-3 transition-colors ${t.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-slate-800/50 dark:border-slate-700'}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(key)}
                    disabled={isSubmitted}
                    className="mt-0.5 flex-shrink-0 disabled:opacity-50"
                  >
                    {t.completed
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <Circle className="w-5 h-5 text-gray-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${t.completed ? 'text-green-800 dark:text-green-200' : 'text-gray-800 dark:text-slate-200'}`}>
                        {TASK_NAMES[key]}
                      </span>
                      {deadline && (
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${deadlinePassed && !t.completed ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                          <Clock className="w-3 h-3" /> {deadline}
                        </span>
                      )}
                    </div>
                    {t.completed && !isSubmitted && (
                      <Textarea
                        value={t.note}
                        onChange={(e) => setTasks((prev) => ({ ...prev, [key]: { ...prev[key], note: e.target.value } }))}
                        placeholder="Optional note..."
                        className="mt-2 text-sm h-16 resize-none"
                      />
                    )}
                    {t.completed && isSubmitted && t.note && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{t.note}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <div className="pt-3">
            <Button
              onClick={handleSave}
              disabled={saving || isSubmitted}
              className="w-full"
            >
              {saving ? 'Saving...' : isSubmitted ? 'Report Already Submitted' : 'Save Task Report'}
            </Button>
            {isSubmitted && todayLog?.verificationNote && (
              <p className="mt-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                <strong>Feedback:</strong> {todayLog.verificationNote}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Monthly Overview</CardTitle>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium w-28 text-center">
                {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
                disabled={isToday}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-xs font-medium text-gray-400 dark:text-slate-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
              const log = getLogForDay(day)
              const color = getDayColor(log, d)
              const isCurrentDay = d.toDateString() === new Date().toDateString()
              return (
                <button
                  key={day}
                  onClick={() => log && setSelectedLog(log)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all ${color} ${log ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${isCurrentDay ? 'ring-2 ring-dopa-green ring-offset-1' : ''}`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 inline-block" />All done</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30 inline-block" />Partial</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 inline-block" />Missed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 dark:bg-slate-700 inline-block" />Future</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Tasks — {selectedLog && formatDate(selectedLog.date)}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                {statusBadge(selectedLog.status)}
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {selectedLog.tasks.filter((t) => t.completed).length}/9 completed
                </span>
              </div>
              {selectedLog.tasks.map((t) => (
                <div key={t.taskKey} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${t.completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                  {t.completed
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-sm font-medium">{t.taskName}</p>
                    {t.note && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.note}</p>}
                  </div>
                </div>
              ))}
              {selectedLog.verificationNote && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm text-orange-700 dark:text-orange-300">
                  <strong>Feedback:</strong> {selectedLog.verificationNote}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
