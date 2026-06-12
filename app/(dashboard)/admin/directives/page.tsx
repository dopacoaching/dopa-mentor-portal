'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Archive, Pencil, ArchiveRestore, Eye, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import type { IDirective } from '@/types'

const REGIONS = ['calicut', 'kottakkal', 'thrissur', 'ig']
const REGIONS_LABELS: Record<string, string> = { calicut: 'Calicut', kottakkal: 'Kottakkal', thrissur: 'Thrissur', ig: 'Integrated School (IG)' }

export default function AdminDirectivesPage() {
  const [directives, setDirectives] = useState<IDirective[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editDirective, setEditDirective] = useState<IDirective | null>(null)
  const [form, setForm] = useState({ title: '', content: '', targetScope: 'all', targetRegion: '', targetCampus: '', targetMentorId: '' })
  const [viewDirective, setViewDirective] = useState<IDirective | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchDirectives = useCallback(async () => {
    const r = await fetch('/api/directives')
    const d = await r.json()
    setDirectives(d.directives ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDirectives() }, [fetchDirectives])

  async function handleSave() {
    setSaving(true)
    try {
      const url = editDirective ? `/api/directives/${editDirective._id}` : '/api/directives'
      const method = editDirective ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success(editDirective ? 'Directive updated' : 'Directive published!')
      setShowCreate(false)
      setEditDirective(null)
      setForm({ title: '', content: '', targetScope: 'all', targetRegion: '', targetCampus: '', targetMentorId: '' })
      await fetchDirectives()
    } finally { setSaving(false) }
  }

  async function handleArchive(id: string) {
    if (!window.confirm('Archive this directive? It will no longer be visible to mentors.')) return
    const r = await fetch(`/api/directives/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Directive archived'); await fetchDirectives() }
    else { toast.error('Failed to archive directive') }
  }

  async function handleRestore(id: string) {
    const r = await fetch(`/api/directives/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    if (r.ok) { toast.success('Directive restored'); await fetchDirectives() }
    else { toast.error('Failed to restore directive') }
  }

  const active = directives.filter((d) => d.isActive)
  const archived = directives.filter((d) => !d.isActive)

  function DirectiveForm() {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title *</Label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Directive title" />
        </div>
        <div className="space-y-1.5">
          <Label>Content *</Label>
          <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} className="h-32" placeholder="Write your directive here..." />
        </div>
        <div className="space-y-1.5">
          <Label>Target Scope</Label>
          <Select value={form.targetScope} onValueChange={(v) => setForm((f) => ({ ...f, targetScope: v, targetRegion: '', targetCampus: '', targetMentorId: '' }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mentors</SelectItem>
              <SelectItem value="regional_head">All Regional Heads</SelectItem>
              <SelectItem value="region">Mentors — By Region</SelectItem>
              <SelectItem value="campus">Mentors — By Campus</SelectItem>
              <SelectItem value="individual">Individual Mentor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.targetScope === 'region' && (
          <div className="space-y-1.5">
            <Label>Region</Label>
            <Select value={form.targetRegion} onValueChange={(v) => setForm((f) => ({ ...f, targetRegion: v }))}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{REGIONS_LABELS[r] ?? r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {form.targetScope === 'campus' && (
          <div className="space-y-1.5">
            <Label>Campus Name</Label>
            <Input value={form.targetCampus} onChange={(e) => setForm((f) => ({ ...f, targetCampus: e.target.value }))} placeholder="e.g. Calicut Main Campus" />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowCreate(false); setEditDirective(null) }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.title || !form.content}>
            {saving ? 'Saving...' : editDirective ? 'Update' : 'Publish'}
          </Button>
        </DialogFooter>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monthly Directives</h1>
        <Button onClick={() => { setShowCreate(true); setEditDirective(null); setForm({ title: '', content: '', targetScope: 'all', targetRegion: '', targetCampus: '', targetMentorId: '' }) }}>
          <Plus className="w-4 h-4 mr-1.5" /> New Directive
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Active</h2>
        {loading ? [...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />) :
          active.length === 0 ? <p className="text-sm text-gray-400 dark:text-slate-500 py-4">No active directives</p> :
          active.map((d) => (
            <Card key={d._id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{d.title}</p>
                      <Badge variant="info" className="text-xs">{
                        d.targetScope === 'all' ? 'All Mentors' :
                        d.targetScope === 'regional_head' ? 'Regional Heads' :
                        d.targetRegion || d.targetCampus || 'Individual'
                      }</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{d.content}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Expires {formatDate(d.expiresAt)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setViewDirective(d)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditDirective(d); setForm({ title: d.title, content: d.content, targetScope: d.targetScope, targetRegion: d.targetRegion ?? '', targetCampus: d.targetCampus ?? '', targetMentorId: '' }) }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleArchive(d._id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300" title="Archive">
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Archived</h2>
          {archived.map((d) => (
            <div key={d._id} className="border dark:border-slate-700 rounded-xl p-4 opacity-70 bg-gray-50 dark:bg-slate-800 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{d.title}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{d.targetScope} · Archived {formatDate(d.publishedAt)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setViewDirective(d)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300" title="View">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => handleRestore(d._id)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-950 rounded text-gray-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400" title="Restore directive">
                  <ArchiveRestore className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Dialog */}
      {viewDirective && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewDirective(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewDirective(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={viewDirective.isActive ? 'success' : 'secondary'}>{viewDirective.isActive ? 'Active' : 'Archived'}</Badge>
              <Badge variant="info" className="text-xs">{
                viewDirective.targetScope === 'all' ? 'All Mentors' :
                viewDirective.targetScope === 'regional_head' ? 'Regional Heads' :
                viewDirective.targetRegion || viewDirective.targetCampus || 'Individual'
              }</Badge>
            </div>
            <h2 className="text-xl font-bold mb-2">{viewDirective.title}</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
              Published {formatDate(viewDirective.publishedAt)} · Expires {formatDate(viewDirective.expiresAt)}
            </p>
            <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{viewDirective.content}</p>
          </div>
        </div>
      )}

      <Dialog open={showCreate || !!editDirective} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditDirective(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editDirective ? 'Edit Directive' : 'Publish New Directive'}</DialogTitle></DialogHeader>
          <DirectiveForm />
        </DialogContent>
      </Dialog>
    </div>
  )
}
