'use client'

import { useEffect, useState } from 'react'
import { Users, CheckSquare, Clock, AlertTriangle, MapPin, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import StatCard from '@/components/dashboard/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

interface DashboardData {
  activeMentors: number
  activeClassTeachers: number
  todayTaskCompletion: { completed: number; total: number }
  pendingVerifications: number
  missedToday: { mentorName: string; campus: string; batchId: string; tasksCompleted: number }[]
  pendingVerificationList: { mentorName: string; date: string; hoursSince: number; batchId: string }[]
  upcomingVisits: { visitDate: string; mentorName: string; campus: string; visitType: string }[]
  doubtSummary: { physics: number; chemistry: number; biology: number; mathematics: number; general: number; total: number }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (error) {
    return <div className="py-20 text-center text-red-500">Failed to load dashboard. Please refresh.</div>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const completionPct = data
    ? Math.round((data.todayTaskCompletion.completed / Math.max(data.todayTaskCompletion.total, 1)) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => router.push('/admin/directives')}>
            <Plus className="w-4 h-4 mr-1" /> Push Directive
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push('/admin/payments')}>
            Payments
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push('/admin/reports')}>
            Reports
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Mentors" value={data?.activeMentors ?? 0} icon={<Users className="w-7 h-7" />} color="green" />
        <StatCard title="Active Class Teachers" value={data?.activeClassTeachers ?? 0} icon={<Users className="w-7 h-7" />} color="blue" />
        <StatCard
          title="Today's Completion"
          value={`${data?.todayTaskCompletion.completed ?? 0}/${data?.todayTaskCompletion.total ?? 0}`}
          subtitle={`${completionPct}% submitted`}
          icon={<CheckSquare className="w-7 h-7" />}
          color={completionPct >= 80 ? 'green' : completionPct >= 50 ? 'yellow' : 'red'}
        />
        <StatCard
          title="Pending Verifications"
          value={data?.pendingVerifications ?? 0}
          icon={<Clock className="w-7 h-7" />}
          color={data && data.pendingVerifications > 10 ? 'red' : 'yellow'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Missed Tasks Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.missedToday.length ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">No missed tasks today</p>
            ) : (
              <div className="space-y-2">
                {data.missedToday.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b dark:border-slate-700 last:border-0 text-sm">
                    <div>
                      <p className="font-medium">{m.mentorName}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{m.campus} · {m.batchId}</p>
                    </div>
                    <Badge variant="destructive">{9 - m.tasksCompleted} missed</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" /> Pending Verifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.pendingVerificationList.length ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">All caught up!</p>
            ) : (
              <div className="space-y-2">
                {data.pendingVerificationList.slice(0, 8).map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b dark:border-slate-700 last:border-0 text-sm">
                    <div>
                      <p className="font-medium">{v.mentorName}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{formatDate(v.date)} · {v.batchId}</p>
                    </div>
                    <Badge variant={v.hoursSince > 24 ? 'destructive' : 'warning'}>
                      {v.hoursSince}h ago
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" /> Upcoming Visits (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.upcomingVisits.length ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">No visits scheduled</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingVisits.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b dark:border-slate-700 last:border-0 text-sm">
                    <div>
                      <p className="font-medium">{v.mentorName}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{v.campus}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{formatDate(v.visitDate)}</p>
                      <Badge variant="info" className="text-xs mt-0.5">
                        {v.visitType === 'campus_group' ? 'Group' : v.visitType === 'merged_group' ? 'Merged' : '1-on-1'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Doubt Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.doubtSummary ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">No data</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Physics', value: data.doubtSummary.physics, color: 'bg-blue-500' },
                  { label: 'Chemistry', value: data.doubtSummary.chemistry, color: 'bg-green-500' },
                  { label: 'Biology', value: data.doubtSummary.biology, color: 'bg-yellow-500' },
                  { label: 'Mathematics', value: data.doubtSummary.mathematics, color: 'bg-purple-500' },
                  { label: 'General', value: data.doubtSummary.general, color: 'bg-gray-400' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-slate-400">{s.label}</span>
                      <span className="font-medium">{s.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.color} rounded-full transition-all`}
                        style={{ width: `${Math.min(100, data.doubtSummary.total > 0 ? (s.value / data.doubtSummary.total) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t dark:border-slate-700 text-sm font-semibold flex justify-between">
                  <span>Total</span>
                  <span>{data.doubtSummary.total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
