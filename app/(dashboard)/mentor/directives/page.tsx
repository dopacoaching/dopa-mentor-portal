'use client'

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { IDirective } from '@/types'

export default function MentorDirectivesPage() {
  const [directives, setDirectives] = useState<IDirective[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/directives').then((r) => r.json()).then((d) => {
      setDirectives(d.directives ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Monthly Directives</h1>

      {directives.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 rounded-r-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Active Directive This Month</span>
          </div>
          <p className="font-bold text-amber-900 dark:text-amber-200 text-lg">{directives[0].title}</p>
          <p className="text-amber-800 dark:text-amber-300 mt-2 text-sm whitespace-pre-wrap">{directives[0].content}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">Active until {formatDate(directives[0].expiresAt)}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : directives.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No active directives this month</p>
        </div>
      ) : (
        <div className="space-y-4">
          {directives.map((d) => (
            <Card key={d._id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{d.title}</CardTitle>
                <p className="text-xs text-gray-400 dark:text-slate-500">Published {formatDate(d.publishedAt)} · Expires {formatDate(d.expiresAt)}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{d.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
