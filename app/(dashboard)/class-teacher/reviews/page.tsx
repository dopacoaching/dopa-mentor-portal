'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { IVisit, IUser } from '@/types'

export default function CTReviewsPage() {
  const [visits, setVisits] = useState<(Omit<IVisit, 'mentorId'> & { mentorId: IUser })[]>([])
  const [loading, setLoading] = useState(true)
  type PopulatedVisit = Omit<IVisit, 'mentorId'> & { mentorId: IUser }
  const [reviewDialog, setReviewDialog] = useState<{ visit: PopulatedVisit | null; open: boolean }>({ visit: null, open: false })
  const [form, setForm] = useState({ wasPunctual: true, interactionQuality: 3, interactionComments: '', directiveCovered: 'yes', overallEffectiveness: 3, observations: '', recommendedAction: 'none' })
  const [submitting, setSubmitting] = useState(false)

  const fetchVisits = useCallback(async () => {
    const now = new Date()
    const r = await fetch(`/api/visits?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
    const d = await r.json()
    setVisits((d.visits ?? []).filter((v: IVisit) => v.mentorReportSubmitted && !v.ctReviewSubmitted))
    setLoading(false)
  }, [])

  useEffect(() => { fetchVisits() }, [fetchVisits])

  async function handleSubmitReview() {
    if (!reviewDialog.visit) return
    setSubmitting(true)
    try {
      const r = await fetch('/api/visits/ct-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: reviewDialog.visit._id, ...form }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success('Review submitted!')
      setReviewDialog({ visit: null, open: false })
      await fetchVisits()
    } finally { setSubmitting(false) }
  }

  function RatingSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${value >= n ? 'bg-dopa-green text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
            {n}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">CT Visit Reviews</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Confidential — not visible to mentors</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">No visits awaiting review</div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Card key={visit._id}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{visit.mentorId?.name ?? 'Unknown'}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{visit.campus} · {formatDate(visit.visitDate)}</p>
                  <Badge variant="warning" className="mt-1.5">Review Pending</Badge>
                </div>
                <Button size="sm" onClick={() => { setReviewDialog({ visit, open: true }); setForm({ wasPunctual: true, interactionQuality: 3, interactionComments: '', directiveCovered: 'yes', overallEffectiveness: 3, observations: '', recommendedAction: 'none' }) }}>
                  Write Review
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={reviewDialog.open} onOpenChange={(o) => setReviewDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>CT Visit Review</DialogTitle>
            <p className="text-xs text-gray-500 dark:text-slate-400">This review is confidential and not visible to the mentor.</p>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="punctual" checked={form.wasPunctual} onChange={(e) => setForm((f) => ({ ...f, wasPunctual: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="punctual" className="text-sm font-medium">Mentor was punctual</label>
            </div>
            <div className="space-y-1.5">
              <Label>Interaction Quality (1–5)</Label>
              <RatingSelector value={form.interactionQuality} onChange={(v) => setForm((f) => ({ ...f, interactionQuality: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Interaction Comments</Label>
              <Textarea value={form.interactionComments} onChange={(e) => setForm((f) => ({ ...f, interactionComments: e.target.value }))} className="h-20" />
            </div>
            <div className="space-y-1.5">
              <Label>Directive Covered?</Label>
              <Select value={form.directiveCovered} onValueChange={(v) => setForm((f) => ({ ...f, directiveCovered: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="partially">Partially</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Overall Effectiveness (1–5)</Label>
              <RatingSelector value={form.overallEffectiveness} onChange={(v) => setForm((f) => ({ ...f, overallEffectiveness: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))} className="h-20" />
            </div>
            <div className="space-y-1.5">
              <Label>Recommended Action</Label>
              <Select value={form.recommendedAction} onValueChange={(v) => setForm((f) => ({ ...f, recommendedAction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No action needed</SelectItem>
                  <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
                  <SelectItem value="escalate_admin">Escalate to Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ visit: null, open: false })}>Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Review'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
