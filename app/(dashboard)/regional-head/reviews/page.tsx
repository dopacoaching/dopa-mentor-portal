'use client'

import { useEffect, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

interface ReviewItem {
  _id: string
  mentorId: { _id: string; name: string; campus: string } | null
  classTeacherId: { _id: string; name: string } | null
  visitDate: string
  wasPunctual: boolean
  interactionQuality: number
  interactionComments: string
  directiveCovered: string
  overallEffectiveness: number
  observations: string
  recommendedAction: string
  createdAt: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function RatingDots({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className={`w-2 h-2 rounded-full ${value >= n ? 'bg-dopa-green' : 'bg-gray-200 dark:bg-slate-700'}`} />
      ))}
    </div>
  )
}

export default function RegionalHeadReviewsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [detailReview, setDetailReview] = useState<ReviewItem | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/visits/ct-review?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [month, year])

  const actionLabel = (a: string) => ({
    none: 'No Action',
    needs_followup: 'Follow-up',
    escalate_admin: 'Escalate',
  }[a] ?? a)

  const actionVariant = (a: string) => a === 'escalate_admin' ? 'destructive' : a === 'needs_followup' ? 'warning' : 'secondary'

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">CT Visit Reviews</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Read-only — your region&apos;s submitted reviews</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No CT reviews for {MONTHS[month - 1]} {year}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r._id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailReview(r)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{r.mentorId?.name ?? 'Unknown Mentor'}</p>
                      <Badge variant={actionVariant(r.recommendedAction)} className="text-xs">{actionLabel(r.recommendedAction)}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                      {r.mentorId?.campus ?? '—'} · {formatDate(r.visitDate)} · By {r.classTeacherId?.name ?? '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                      <span>Interaction</span>
                      <RatingDots value={r.interactionQuality} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                      <span>Effectiveness</span>
                      <RatingDots value={r.overallEffectiveness} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {detailReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetailReview(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetailReview(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant={actionVariant(detailReview.recommendedAction)}>{actionLabel(detailReview.recommendedAction)}</Badge>
              {detailReview.wasPunctual && <Badge variant="success" className="text-xs">Punctual</Badge>}
            </div>
            <h2 className="text-lg font-bold">{detailReview.mentorId?.name ?? 'Unknown'}</h2>
            <p className="text-sm text-gray-400 dark:text-slate-500 mb-4">
              {detailReview.mentorId?.campus ?? '—'} · {formatDate(detailReview.visitDate)} · Reviewed by {detailReview.classTeacherId?.name ?? '—'}
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-slate-400">Interaction Quality</span>
                <div className="flex items-center gap-2">
                  <RatingDots value={detailReview.interactionQuality} />
                  <span className="font-medium">{detailReview.interactionQuality}/5</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-slate-400">Overall Effectiveness</span>
                <div className="flex items-center gap-2">
                  <RatingDots value={detailReview.overallEffectiveness} />
                  <span className="font-medium">{detailReview.overallEffectiveness}/5</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-slate-400">Directive Covered</span>
                <span className="capitalize font-medium">{detailReview.directiveCovered}</span>
              </div>
              {detailReview.interactionComments && (
                <div>
                  <p className="text-gray-500 dark:text-slate-400 mb-1">Interaction Comments</p>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-800 rounded-lg p-2.5 text-xs leading-relaxed">{detailReview.interactionComments}</p>
                </div>
              )}
              {detailReview.observations && (
                <div>
                  <p className="text-gray-500 dark:text-slate-400 mb-1">Observations</p>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-800 rounded-lg p-2.5 text-xs leading-relaxed">{detailReview.observations}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
