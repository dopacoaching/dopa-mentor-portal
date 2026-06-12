'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, MessageSquare, MapPin, BookOpen, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import StatCard from '@/components/dashboard/StatCard'
import { useAppSelector } from '@/store/hooks'
import { formatDate } from '@/lib/utils'
import type { ITaskLog, IDoubtLog, IDirective, IVisit } from '@/types'

export default function MentorDashboard() {
  const router = useRouter()
  const { userId, name } = useAppSelector((s) => s.auth)
  const [taskLog, setTaskLog] = useState<ITaskLog | null>(null)
  const [doubtSummary, setDoubtSummary] = useState({ total: 0 })
  const [directives, setDirectives] = useState<IDirective[]>([])
  const [visits, setVisits] = useState<IVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    Promise.all([
      fetch(`/api/tasks/${userId}?month=${m}&year=${y}`).then((r) => { if (!r.ok) throw new Error(); return r.json() }),
      fetch(`/api/doubts/${userId}?month=${m}&year=${y}`).then((r) => { if (!r.ok) throw new Error(); return r.json() }),
      fetch('/api/directives').then((r) => { if (!r.ok) throw new Error(); return r.json() }),
      fetch(`/api/visits?mentorId=${userId}&month=${m}&year=${y}`).then((r) => { if (!r.ok) throw new Error(); return r.json() }),
    ]).then(([tasks, doubts, dirs, vis]) => {
      const todayStr = now.toDateString()
      const todayLog = tasks.logs?.find((l: ITaskLog) => new Date(l.date).toDateString() === todayStr) ?? null
      setTaskLog(todayLog)
      setDoubtSummary({ total: doubts.summary?.total ?? 0 })
      setDirectives(dirs.directives ?? [])
      setVisits(vis.visits ?? [])
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [userId])

  if (error) {
    return <div className="py-20 text-center text-red-500">Failed to load dashboard. Please refresh.</div>
  }

  const todayCompleted = taskLog?.tasks.filter((t) => t.completed).length ?? 0
  const todayActive = taskLog?.tasks.filter((t) => !t.omitted).length ?? 9
  const progressPct = (doubtSummary.total / 300) * 100
  const pendingVisit = visits.find((v) => v.status === 'scheduled' || v.status === 'confirmed')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {directives.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">Active Directive</p>
          <p className="font-semibold text-amber-900 dark:text-amber-200">{directives[0].title}</p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 line-clamp-2">{directives[0].content}</p>
          <button onClick={() => router.push('/mentor/directives')} className="text-xs text-amber-600 dark:text-amber-400 underline mt-1">View full directive</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Today's Tasks"
          value={`${todayCompleted}/${todayActive}`}
          subtitle={taskLog ? `Status: ${taskLog.status}` : 'Not submitted yet'}
          color={todayCompleted === todayActive ? 'green' : todayCompleted > 0 ? 'yellow' : 'red'}
          icon={<CheckSquare className="w-7 h-7" />}
        />
        <StatCard
          title="Doubts This Month"
          value={doubtSummary.total}
          subtitle={doubtSummary.total >= 300 ? 'Bonus earned!' : `${300 - doubtSummary.total} to quota`}
          color={doubtSummary.total >= 300 ? 'green' : doubtSummary.total >= 200 ? 'yellow' : 'blue'}
          icon={<MessageSquare className="w-7 h-7" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Doubt Progress</span>
              <Badge variant={doubtSummary.total >= 300 ? 'success' : 'secondary'}>{doubtSummary.total}/300</Badge>
            </div>
            <Progress value={Math.min(100, progressPct)} />
            <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => router.push('/mentor/doubts')}>
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Log Today's Doubts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Button size="sm" className="w-full" onClick={() => router.push('/mentor/tasks')}>
                <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Today's Checklist
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => router.push('/mentor/visits')}>
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> My Visits
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => router.push('/mentor/directives')}>
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> View Directives
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingVisit && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" /> Upcoming Visit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{pendingVisit.campus}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{formatDate(pendingVisit.visitDate)} · {pendingVisit.visitType === 'campus_group' ? 'Group Visit' : pendingVisit.visitType === 'merged_group' ? 'Merged Group' : 'One-to-One'}</p>
              </div>
              <Badge variant={pendingVisit.status === 'confirmed' ? 'success' : 'warning'}>
                {pendingVisit.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
