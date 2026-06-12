'use client'

import { useEffect, useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { IDirective } from '@/types'

export default function MentorDirectivesPage() {
  const [directives, setDirectives] = useState<IDirective[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [viewDirective, setViewDirective] = useState<IDirective | null>(null)

  useEffect(() => {
    fetch('/api/directives')
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((d) => setDirectives(d.directives ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
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

      {error ? (
        <div className="py-16 text-center text-red-500">Failed to load directives. Please refresh.</div>
      ) : loading ? (
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
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs flex-shrink-0" onClick={() => setViewDirective(d)}>
                    View
                  </Button>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">Published {formatDate(d.publishedAt)} · Expires {formatDate(d.expiresAt)}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-3">{d.content}</p>
              </CardContent>
            </Card>
          ))}

          {/* View detail modal */}
          {viewDirective && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewDirective(null)}>
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setViewDirective(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">Monthly Directive</p>
                <h2 className="text-xl font-bold mb-1">{viewDirective.title}</h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Active until {formatDate(viewDirective.expiresAt)}</p>
                <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{viewDirective.content}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
