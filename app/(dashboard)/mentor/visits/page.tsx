'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapPin, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppSelector } from '@/store/hooks'
import { formatDate } from '@/lib/utils'
import type { IVisit } from '@/types'

const STATUS_BADGE: Record<string, JSX.Element> = {
  scheduled: <Badge variant="warning">Scheduled</Badge>,
  confirmed: <Badge variant="success">Confirmed</Badge>,
  change_requested: <Badge variant="info">Change Requested</Badge>,
  completed: <Badge variant="success">Completed</Badge>,
  missed: <Badge variant="destructive">Missed</Badge>,
}

interface ReportForm {
  numberOfStudentsMet: number
  discussionTopics: string
  directiveCovered: boolean
  studentObservations: string
  followUpRequired: boolean
  followUpDetails: string
}

export default function MentorVisitsPage() {
  const { userId } = useAppSelector((s) => s.auth)
  const [visits, setVisits] = useState<IVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [changeDialog, setChangeDialog] = useState<{ visitId: string; open: boolean }>({ visitId: '', open: false })
  const [changeReason, setChangeReason] = useState('')
  const [reportDialog, setReportDialog] = useState<{ visit: IVisit | null; open: boolean }>({ visit: null, open: false })
  const [reportForm, setReportForm] = useState<ReportForm>({ numberOfStudentsMet: 0, discussionTopics: '', directiveCovered: false, studentObservations: '', followUpRequired: false, followUpDetails: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchVisits = useCallback(async () => {
    if (!userId) return
    const now = new Date()
    const r = await fetch(`/api/visits?mentorId=${userId}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
    const d = await r.json()
    setVisits(d.visits ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchVisits() }, [fetchVisits])

  async function handleConfirm(visitId: string) {
    const r = await fetch('/api/visits/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitId, action: 'confirm' }) })
    if (r.ok) { toast.success('Visit confirmed!'); await fetchVisits() }
    else { const d = await r.json(); toast.error(d.error) }
  }

  async function handleChangeRequest() {
    if (!changeReason.trim()) return
    const r = await fetch('/api/visits/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitId: changeDialog.visitId, action: 'request_change', reason: changeReason }) })
    if (r.ok) { toast.success('Change request sent'); setChangeDialog({ visitId: '', open: false }); setChangeReason(''); await fetchVisits() }
    else { const d = await r.json(); toast.error(d.error) }
  }

  async function handleSubmitReport() {
    if (!reportDialog.visit) return
    setSubmitting(true)
    try {
      const r = await fetch('/api/visits/mentor-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: reportDialog.visit._id, ...reportForm }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success('Visit report submitted!')
      setReportDialog({ visit: null, open: false })
      await fetchVisits()
    } finally { setSubmitting(false) }
  }

  const today = new Date()

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">My Visits</h1>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No visits scheduled this month</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => {
            const isPast = new Date(visit.visitDate) < today
            const canSubmitReport = isPast && visit.status === 'completed' && !visit.mentorReportSubmitted
            return (
              <Card key={visit._id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-dopa-light flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-dopa-green" />
                      </div>
                      <div>
                        <p className="font-semibold">{visit.campus}</p>
                        <p className="text-sm text-gray-500">{formatDate(visit.visitDate)} · {visit.visitType === 'campus_group' ? 'Group Visit' : visit.visitType === 'merged_group' ? 'Merged Group' : 'One-to-One'}</p>
                        {visit.mentorChangeReason && (
                          <p className="text-xs text-gray-400 mt-1">Reason: {visit.mentorChangeReason}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {STATUS_BADGE[visit.status]}
                          {visit.mentorReportSubmitted && <Badge variant="success"><FileText className="w-3 h-3 mr-1" />Report Done</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {visit.status === 'scheduled' && (
                        <>
                          <Button size="sm" onClick={() => handleConfirm(visit._id)}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setChangeDialog({ visitId: visit._id, open: true }); setChangeReason('') }}>
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Change
                          </Button>
                        </>
                      )}
                      {canSubmitReport && (
                        <Button size="sm" onClick={() => { setReportDialog({ visit, open: true }); setReportForm({ numberOfStudentsMet: 0, discussionTopics: '', directiveCovered: false, studentObservations: '', followUpRequired: false, followUpDetails: '' }) }}>
                          <FileText className="w-3.5 h-3.5 mr-1" /> Submit Report
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={changeDialog.open} onOpenChange={(o) => setChangeDialog((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Visit Change</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Please explain why you need to reschedule:</p>
            <Textarea value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="Reason for change..." className="h-24" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialog({ visitId: '', open: false })}>Cancel</Button>
            <Button onClick={handleChangeRequest} disabled={!changeReason.trim()}>Send Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportDialog.open} onOpenChange={(o) => setReportDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit Visit Report</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Number of Students Met</Label>
              <Input type="number" min={0} value={reportForm.numberOfStudentsMet} onChange={(e) => setReportForm((f) => ({ ...f, numberOfStudentsMet: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Discussion Topics</Label>
              <Textarea value={reportForm.discussionTopics} onChange={(e) => setReportForm((f) => ({ ...f, discussionTopics: e.target.value }))} className="h-20" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="directive" checked={reportForm.directiveCovered} onChange={(e) => setReportForm((f) => ({ ...f, directiveCovered: e.target.checked }))} className="w-4 h-4 rounded" />
              <label htmlFor="directive" className="text-sm font-medium">Monthly directive was covered</label>
            </div>
            <div className="space-y-1.5">
              <Label>Student Observations</Label>
              <Textarea value={reportForm.studentObservations} onChange={(e) => setReportForm((f) => ({ ...f, studentObservations: e.target.value }))} className="h-20" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="followup" checked={reportForm.followUpRequired} onChange={(e) => setReportForm((f) => ({ ...f, followUpRequired: e.target.checked }))} className="w-4 h-4 rounded" />
              <label htmlFor="followup" className="text-sm font-medium">Follow-up required</label>
            </div>
            {reportForm.followUpRequired && (
              <div className="space-y-1.5">
                <Label>Follow-up Details</Label>
                <Textarea value={reportForm.followUpDetails} onChange={(e) => setReportForm((f) => ({ ...f, followUpDetails: e.target.value }))} className="h-16" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialog({ visit: null, open: false })}>Cancel</Button>
            <Button onClick={handleSubmitReport} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Report'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
