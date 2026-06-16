'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, MapPin, Clock, Users } from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { apiGet } from '@/lib/client/api'
import type { ITaskLog, IUser, IVisit } from '@/types'

export default function ClassTeacherDashboard() {
  const router = useRouter()
  const [pending, setPending] = useState(0)
  const [recentLogs, setRecentLogs] = useState<(ITaskLog & { mentorId: IUser })[]>([])
  const [upcomingVisits, setUpcomingVisits] = useState<IVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    Promise.all([
      apiGet<{ logs?: (ITaskLog & { mentorId: IUser })[] }>(`/api/tasks?month=${m}&year=${y}`),
      apiGet<{ visits?: IVisit[] }>(`/api/visits?month=${m}&year=${y}`),
    ]).then(([tasks, vis]) => {
      const logs = tasks.logs ?? []
      const pendingLogs = logs.filter((l: ITaskLog) => l.status === 'submitted')
      setPending(pendingLogs.length)
      setRecentLogs(logs.slice(0, 5))
      setUpcomingVisits((vis.visits ?? []).filter((v: IVisit) => v.status !== 'completed').slice(0, 5))
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [])

  if (error) {
    return <div className="py-20 text-center text-red-500">Failed to load dashboard. Please refresh.</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Class Teacher Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Pending Verifications" value={pending} icon={<Clock className="w-7 h-7" />} color={pending > 5 ? 'red' : 'yellow'} />
        <StatCard title="Upcoming Visits" value={upcomingVisits.length} icon={<MapPin className="w-7 h-7" />} color="blue" />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => router.push('/class-teacher/verify')}>
          <CheckSquare className="w-4 h-4 mr-1.5" /> Verify Tasks {pending > 0 && `(${pending})`}
        </Button>
        <Button variant="outline" onClick={() => router.push('/class-teacher/visits')}>
          <MapPin className="w-4 h-4 mr-1.5" /> Schedule Visit
        </Button>
        <Button variant="outline" onClick={() => router.push('/class-teacher/reviews')}>
          <Users className="w-4 h-4 mr-1.5" /> CT Reviews
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent Task Submissions</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="h-32 animate-pulse bg-gray-100 dark:bg-slate-800 rounded" /> :
              recentLogs.length === 0 ? <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">No submissions yet</p> :
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log._id} className="flex items-center justify-between text-sm py-1.5 border-b dark:border-slate-700 last:border-0">
                    <div>
                      <p className="font-medium">{log.mentorId?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{formatDate(log.date)} · {log.tasks.filter((t) => t.completed).length}/{log.tasks.filter((t) => !t.omitted).length}</p>
                    </div>
                    <Badge variant={log.status === 'submitted' ? 'warning' : log.status === 'verified' ? 'success' : 'destructive'}>
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Upcoming Visits</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="h-32 animate-pulse bg-gray-100 dark:bg-slate-800 rounded" /> :
              upcomingVisits.length === 0 ? <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">No visits scheduled</p> :
              <div className="space-y-2">
                {upcomingVisits.map((v) => (
                  <div key={v._id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div>
                      <p className="font-medium">{v.campus}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{formatDate(v.visitDate)}</p>
                    </div>
                    <Badge variant={v.status === 'confirmed' ? 'success' : 'warning'}>{v.status}</Badge>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
