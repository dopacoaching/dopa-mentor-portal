'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { IVisit, IUser } from '@/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STATUS_BADGE: Record<string, JSX.Element> = {
  scheduled: <Badge variant="warning">Scheduled</Badge>,
  confirmed: <Badge variant="success">Confirmed</Badge>,
  change_requested: <Badge variant="info">Change Req.</Badge>,
  completed: <Badge variant="success">Completed</Badge>,
  missed: <Badge variant="destructive">Missed</Badge>,
}

export default function AdminVisitsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [visits, setVisits] = useState<(Omit<IVisit, 'mentorId'> & { mentorId: IUser })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const r = await fetch(`/api/visits?month=${month}&year=${year}`)
      if (!r.ok) throw new Error()
      const d = await r.json()
      setVisits(d.visits ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchVisits() }, [fetchVisits])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Campus Visits Overview</h1>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Mentor</th>
                <th className="text-left px-4 py-3">Campus</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Report</th>
                <th className="text-center px-4 py-3">CT Review</th>
                <th className="text-center px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {error ? (
                <tr><td colSpan={8} className="text-center py-12 text-red-500 dark:text-red-400">Failed to load visits. Please refresh.</td></tr>
              ) : loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" /></td></tr>)
              ) : visits.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 dark:text-slate-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />No visits found
                </td></tr>
              ) : (
                visits.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium">{v.mentorId?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{v.campus}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{formatDate(v.visitDate)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{v.visitType === 'campus_group' ? 'Group' : v.visitType === 'merged_group' ? 'Merged' : '1-on-1'}</Badge></td>
                    <td className="px-4 py-3">{STATUS_BADGE[v.status]}</td>
                    <td className="px-4 py-3 text-center">{v.mentorReportSubmitted ? '✅' : '—'}</td>
                    <td className="px-4 py-3 text-center">{v.ctReviewSubmitted ? '✅' : '—'}</td>
                    <td className="px-4 py-3 text-center">{v.countedForPayment ? '✅' : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
