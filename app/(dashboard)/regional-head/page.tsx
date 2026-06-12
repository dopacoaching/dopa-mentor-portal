'use client'

import { useEffect, useState } from 'react'
import { Users, FileText, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { IUser, IVisit } from '@/types'

export default function RegionalHeadDashboard() {
  const [teachers, setTeachers] = useState<IUser[]>([])
  const [recentVisits, setRecentVisits] = useState<(Omit<IVisit, 'mentorId'> & { mentorId: IUser })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    Promise.all([
      fetch('/api/users').then((r) => r.json()),
      fetch(`/api/visits?month=${now.getMonth() + 1}&year=${now.getFullYear()}`).then((r) => r.json()),
    ])
      .then(([ud, vd]) => {
        setTeachers(ud.users ?? [])
        setRecentVisits((vd.visits ?? []).slice(0, 5))
      })
      .finally(() => setLoading(false))
  }, [])

  const activeTeachers = teachers.filter((t) => t.isActive).length

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Regional Head Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Overview of your region</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : activeTeachers}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Active Class Teachers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : recentVisits.length}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Visits This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Recent Campus Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
          ) : recentVisits.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">No visits this month</p>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {recentVisits.map((v) => (
                <div key={v._id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{v.mentorId?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{v.campus} · {formatDate(v.visitDate)}</p>
                  </div>
                  <Badge variant={
                    v.status === 'completed' ? 'success' :
                    v.status === 'scheduled' ? 'warning' :
                    v.status === 'missed' ? 'destructive' : 'secondary'
                  } className="text-xs capitalize">
                    {v.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
