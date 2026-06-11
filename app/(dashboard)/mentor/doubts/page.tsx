'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/store/hooks'
import { formatDate } from '@/lib/utils'
import type { IDoubtLog } from '@/types'

interface Summary { physics: number; chemistry: number; biology: number; mathematics: number; general: number; total: number }

const SUBJECTS = [
  { key: 'physics', label: 'Physics', color: 'text-blue-700 dark:text-blue-300' },
  { key: 'chemistry', label: 'Chemistry', color: 'text-green-700 dark:text-green-300' },
  { key: 'biology', label: 'Biology', color: 'text-yellow-700 dark:text-yellow-300' },
  { key: 'mathematics', label: 'Mathematics', color: 'text-purple-700 dark:text-purple-300' },
  { key: 'general', label: 'General', color: 'text-gray-700 dark:text-slate-400' },
] as const

export default function MentorDoubtsPage() {
  const { userId } = useAppSelector((s) => s.auth)
  const [values, setValues] = useState<Record<string, number>>({ physics: 0, chemistry: 0, biology: 0, mathematics: 0, general: 0 })
  const [saving, setSaving] = useState(false)
  const [todayLog, setTodayLog] = useState<IDoubtLog | null>(null)
  const [logs, setLogs] = useState<IDoubtLog[]>([])
  const [summary, setSummary] = useState<Summary>({ physics: 0, chemistry: 0, biology: 0, mathematics: 0, general: 0, total: 0 })
  const [editing, setEditing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!userId) return
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    const r = await fetch(`/api/doubts/${userId}?month=${m}&year=${y}`)
    const d = await r.json()
    setLogs(d.logs ?? [])
    setSummary(d.summary ?? { physics: 0, chemistry: 0, biology: 0, mathematics: 0, general: 0, total: 0 })
    const todayStr = now.toDateString()
    const today = (d.logs ?? []).find((l: IDoubtLog) => new Date(l.date).toDateString() === todayStr) ?? null
    setTodayLog(today)
    if (today) {
      setValues({
        physics: today.subjects.physics,
        chemistry: today.subjects.chemistry,
        biology: today.subjects.biology,
        mathematics: today.subjects.mathematics,
        general: today.subjects.general,
      })
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/doubts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success('Doubt log saved!')
      setEditing(false)
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const progressPct = Math.min(100, (summary.total / 300) * 100)
  const extraDoubts = Math.max(0, summary.total - 300)
  const extraPay = extraDoubts > 0
    ? Math.round(
        (extraDoubts * (summary.physics / summary.total) * 10) +
        (extraDoubts * (summary.chemistry / summary.total) * 10) +
        (extraDoubts * (summary.biology / summary.total) * 5) +
        (extraDoubts * (summary.mathematics / summary.total) * 5) +
        (extraDoubts * (summary.general / summary.total) * 5)
      )
    : 0

  const showForm = !todayLog || editing

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Doubt Web Log</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{summary.total} / 300 doubts cleared</span>
            <Badge variant={summary.total >= 300 ? 'success' : summary.total >= 200 ? 'warning' : 'destructive'}>
              {summary.total >= 300 ? 'Bonus Earned!' : summary.total >= 200 ? 'Almost there' : 'Keep going'}
            </Badge>
          </div>
          <Progress
            value={progressPct}
            className={summary.total >= 300 ? '[&>div]:bg-green-600' : summary.total >= 200 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}
          />
          {summary.total >= 300 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-200">
              <strong>Earning bonus!</strong> +{extraDoubts} extra doubts = ₹{extraPay.toLocaleString()} extra pay
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {SUBJECTS.map(({ key, label, color }) => (
              <div key={key} className="flex justify-between text-sm">
                <span className={`${color} font-medium`}>{label}</span>
                <span>{summary[key as keyof Summary] as number}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Entry</CardTitle>
            {todayLog && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!showForm ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {SUBJECTS.map(({ key, label }) => (
                <div key={key} className="flex justify-between border-b dark:border-slate-700 py-1.5 last:border-0">
                  <span className="text-gray-600 dark:text-slate-400">{label}</span>
                  <span className="font-medium">{todayLog?.subjects[key as keyof typeof todayLog.subjects] ?? 0}</span>
                </div>
              ))}
              <div className="col-span-2 flex justify-between pt-2 border-t dark:border-slate-700 font-semibold text-sm">
                <span>Total</span>
                <span>{todayLog?.totalForDay ?? 0}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {SUBJECTS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={values[key] ?? 0}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: Math.max(0, Number(e.target.value)) }))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400 pb-1">
                <span>Total for today</span>
                <span className="font-semibold">{Object.values(values).reduce((a, b) => a + b, 0)}</span>
              </div>
              <div className="flex gap-2">
                {editing && <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>}
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-slate-400 border-b dark:border-slate-700">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Phy</th>
                  <th className="text-right py-2">Chem</th>
                  <th className="text-right py-2">Bio</th>
                  <th className="text-right py-2">Math</th>
                  <th className="text-right py-2">Gen</th>
                  <th className="text-right py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 text-gray-600 dark:text-slate-400">{formatDate(log.date)}</td>
                    <td className="text-right py-2">{log.subjects.physics}</td>
                    <td className="text-right py-2">{log.subjects.chemistry}</td>
                    <td className="text-right py-2">{log.subjects.biology}</td>
                    <td className="text-right py-2">{log.subjects.mathematics}</td>
                    <td className="text-right py-2">{log.subjects.general}</td>
                    <td className="text-right py-2 font-semibold">{log.totalForDay}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400 dark:text-slate-500">No entries this month</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
