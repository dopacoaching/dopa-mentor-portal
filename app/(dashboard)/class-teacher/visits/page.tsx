'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, MapPin, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { IVisit, IUser } from '@/types'

type PopulatedVisit = Omit<IVisit, 'mentorId'> & { mentorId: IUser }

const STATUS_BADGE: Record<string, JSX.Element> = {
  scheduled: <Badge variant="warning">Scheduled</Badge>,
  confirmed: <Badge variant="success">Confirmed</Badge>,
  change_requested: <Badge variant="info">Change Requested</Badge>,
  completed: <Badge variant="success">Completed</Badge>,
  missed: <Badge variant="destructive">Missed</Badge>,
}

const VISIT_TYPE_LABEL: Record<string, string> = {
  campus_group: 'Group Session',
  merged_group: 'Merged Group',
  one_to_one: 'One-to-One',
}

interface VisitForm {
  mentorId: string
  visitDate: string
  visitType: string
  ctRemark: string
}

const EMPTY_FORM: VisitForm = { mentorId: '', visitDate: '', visitType: 'campus_group', ctRemark: '' }

export default function CTVisitsPage() {
  const [visits, setVisits] = useState<PopulatedVisit[]>([])
  const [mentors, setMentors] = useState<IUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<{ open: boolean; editing: PopulatedVisit | null }>({ open: false, editing: null })
  const [form, setForm] = useState<VisitForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const now = new Date()
    const [visRes, mentorRes] = await Promise.all([
      fetch(`/api/visits?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
      fetch('/api/users?role=mentor'),
    ])
    const [visData, mentorData] = await Promise.all([visRes.json(), mentorRes.json()])
    setVisits(visData.visits ?? [])
    setMentors(mentorData.users ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openNew() {
    setForm(EMPTY_FORM)
    setDialog({ open: true, editing: null })
  }

  function openEdit(visit: PopulatedVisit) {
    setForm({
      mentorId: visit.mentorId._id,
      visitDate: visit.visitDate.slice(0, 10),
      visitType: visit.visitType,
      ctRemark: visit.ctRemark ?? '',
    })
    setDialog({ open: true, editing: visit })
  }

  async function handleSave() {
    if (!form.mentorId || !form.visitDate) { toast.error('Please fill all required fields'); return }
    setSaving(true)
    try {
      let r: Response
      if (dialog.editing) {
        r = await fetch(`/api/visits/${dialog.editing._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitDate: form.visitDate,
            visitType: form.visitType,
            ctRemark: form.ctRemark || null,
          }),
        })
      } else {
        r = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success(dialog.editing ? 'Visit updated!' : 'Visit scheduled!')
      setDialog({ open: false, editing: null })
      await fetchData()
    } finally { setSaving(false) }
  }

  const canEdit = (visit: PopulatedVisit) =>
    visit.status === 'scheduled' || visit.status === 'change_requested'

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campus Visits</h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1.5" /> Schedule Visit
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No visits scheduled this month</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Card key={visit._id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-dopa-light dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-dopa-green" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{visit.mentorId?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {visit.campus} · {formatDate(visit.visitDate)} · {VISIT_TYPE_LABEL[visit.visitType] ?? visit.visitType}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {STATUS_BADGE[visit.status]}
                        {visit.mentorReportSubmitted && <Badge variant="success" className="text-xs">Report ✓</Badge>}
                        {visit.ctReviewSubmitted && <Badge variant="success" className="text-xs">CT Review ✓</Badge>}
                        {visit.countedForPayment && <Badge variant="default" className="text-xs">Payment ✓</Badge>}
                      </div>
                      {visit.mentorChangeReason && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1.5 rounded mt-2">
                          <span className="font-medium">Mentor:</span> {visit.mentorChangeReason}
                        </div>
                      )}
                      {visit.ctRemark && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded mt-2">
                          <span className="font-medium">Remark:</span> {visit.ctRemark}
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit(visit) && (
                    <button
                      onClick={() => openEdit(visit)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog({ open: false, editing: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Edit Visit' : 'Schedule Campus Visit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!dialog.editing && (
              <div className="space-y-1.5">
                <Label>Mentor *</Label>
                <Select value={form.mentorId} onValueChange={(v) => setForm((f) => ({ ...f, mentorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select mentor" /></SelectTrigger>
                  <SelectContent>
                    {mentors.map((m) => (
                      <SelectItem key={m._id} value={m._id}>{m.name} — {m.campus ?? 'No campus'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Visit Date *</Label>
              <Input
                type="date"
                value={form.visitDate}
                onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Visit Type</Label>
              <Select value={form.visitType} onValueChange={(v) => setForm((f) => ({ ...f, visitType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="campus_group">Campus Group Session</SelectItem>
                  <SelectItem value="merged_group">Merged Group Session</SelectItem>
                  <SelectItem value="one_to_one">One-to-One</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Remark <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span></Label>
              <Textarea
                value={form.ctRemark}
                onChange={(e) => setForm((f) => ({ ...f, ctRemark: e.target.value }))}
                placeholder="Add any notes or instructions for this visit…"
                className="h-20 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : dialog.editing ? 'Save Changes' : 'Schedule Visit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
