'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { IVisit, IUser } from '@/types'

const STATUS_BADGE: Record<string, JSX.Element> = {
  scheduled: <Badge variant="warning">Scheduled</Badge>,
  confirmed: <Badge variant="success">Confirmed</Badge>,
  change_requested: <Badge variant="info">Change Requested</Badge>,
  completed: <Badge variant="success">Completed</Badge>,
  missed: <Badge variant="destructive">Missed</Badge>,
}

export default function CTVisitsPage() {
  const [visits, setVisits] = useState<(IVisit & { mentorId: IUser })[]>([])
  const [mentors, setMentors] = useState<IUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ mentorId: '', visitDate: '', visitType: 'campus_group' })
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

  async function handleSchedule() {
    if (!form.mentorId || !form.visitDate) { toast.error('Please fill all required fields'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success('Visit scheduled!')
      setShowForm(false)
      setForm({ mentorId: '', visitDate: '', visitType: 'campus_group' })
      await fetchData()
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campus Visits</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Schedule Visit
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-dopa-light flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-dopa-green" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{visit.mentorId?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{visit.campus} · {formatDate(visit.visitDate)} · {visit.visitType === 'campus_group' ? 'Group' : visit.visitType === 'merged_group' ? 'Merged Group' : '1-on-1'}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {STATUS_BADGE[visit.status]}
                        {visit.mentorReportSubmitted && <Badge variant="success" className="text-xs">Report ✓</Badge>}
                        {visit.ctReviewSubmitted && <Badge variant="success" className="text-xs">CT Review ✓</Badge>}
                        {visit.countedForPayment && <Badge variant="default" className="text-xs">Payment ✓</Badge>}
                      </div>
                    </div>
                  </div>
                  {visit.mentorChangeReason && (
                    <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded max-w-[180px]">
                      Change: {visit.mentorChangeReason}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Campus Visit</DialogTitle></DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-1.5">
              <Label>Visit Date *</Label>
              <Input type="date" value={form.visitDate} onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={saving}>{saving ? 'Scheduling...' : 'Schedule Visit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
