'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Archive, Pencil, ArchiveRestore, Eye, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import type { IDirective } from '@/types'

const REGIONS = ['Calicut', 'Kottakkal', 'Thrissur', 'IG']
const REGIONS_LABELS: Record<string, string> = { Calicut: 'Calicut', Kottakkal: 'Kottakkal', Thrissur: 'Thrissur', IG: 'Integrated School (IG)' }

interface CampusOption { _id: string; name: string }
interface UserOption { _id: string; name: string }

type FormScope = 'all' | 'regional_head' | 'individual_rh' | 'region' | 'campus' | 'individual'

function DirectiveBadge({ d }: { d: IDirective }) {
  if (d.targetScope === 'all') return <Badge variant="info" className="text-xs">All Mentors</Badge>
  if (d.targetScope === 'regional_head') return <Badge variant="info" className="text-xs">All Regional Heads</Badge>
  if (d.targetRegion) return <Badge variant="info" className="text-xs">{d.targetRegion}</Badge>
  if (d.targetCampus) return <Badge variant="info" className="text-xs">{d.targetCampus}</Badge>
  return <Badge variant="info" className="text-xs">Individual</Badge>
}

export default function AdminDirectivesPage() {
  const [directives, setDirectives] = useState<IDirective[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editDirective, setEditDirective] = useState<IDirective | null>(null)
  const [viewDirective, setViewDirective] = useState<IDirective | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [scope, setScope] = useState<FormScope>('all')
  const [targetRegion, setTargetRegion] = useState('')
  const [targetCampus, setTargetCampus] = useState('')
  const [targetMentorId, setTargetMentorId] = useState('')

  // Dynamic options
  const [campuses, setCampuses] = useState<CampusOption[]>([])
  const [rhUsers, setRhUsers] = useState<UserOption[]>([])
  const [mentorUsers, setMentorUsers] = useState<UserOption[]>([])

  const fetchDirectives = useCallback(async () => {
    const r = await fetch('/api/directives')
    const d = await r.json()
    setDirectives(d.directives ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDirectives() }, [fetchDirectives])

  // Fetch campuses when campus scope selected
  useEffect(() => {
    if (scope !== 'campus') return
    fetch('/api/campuses')
      .then((r) => r.json())
      .then((d) => setCampuses(d.campuses ?? []))
  }, [scope])

  // Fetch regional heads when individual_rh selected
  useEffect(() => {
    if (scope !== 'individual_rh') return
    fetch('/api/users?role=regional_head')
      .then((r) => r.json())
      .then((d) => setRhUsers(d.users ?? []))
  }, [scope])

  // Fetch mentors when individual mentor selected
  useEffect(() => {
    if (scope !== 'individual') return
    fetch('/api/users?role=mentor')
      .then((r) => r.json())
      .then((d) => setMentorUsers(d.users ?? []))
  }, [scope])

  function openCreate() {
    setTitle(''); setContent(''); setScope('all')
    setTargetRegion(''); setTargetCampus(''); setTargetMentorId('')
    setEditDirective(null)
    setShowCreate(true)
  }

  function openEdit(d: IDirective) {
    setTitle(d.title)
    setContent(d.content)
    const s: FormScope = d.targetScope === 'individual' && !d.targetRegion && !d.targetCampus
      ? 'individual'
      : d.targetScope as FormScope
    setScope(s)
    setTargetRegion(d.targetRegion ?? '')
    setTargetCampus(d.targetCampus ?? '')
    setTargetMentorId('')
    setEditDirective(d)
    setShowCreate(true)
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) { toast.error('Title and content are required'); return }

    // Map UI scope to API scope + extra fields
    let apiScope = scope as string
    let apiMentorId = targetMentorId
    if (scope === 'individual_rh') { apiScope = 'individual'; apiMentorId = targetMentorId }

    // Validate required sub-fields
    if (scope === 'region' && !targetRegion) { toast.error('Select a region'); return }
    if (scope === 'campus' && !targetCampus) { toast.error('Select a campus'); return }
    if ((scope === 'individual' || scope === 'individual_rh') && !apiMentorId) { toast.error('Select a recipient'); return }

    setSaving(true)
    try {
      const url = editDirective ? `/api/directives/${editDirective._id}` : '/api/directives'
      const method = editDirective ? 'PUT' : 'POST'
      const body = {
        title: title.trim(),
        content: content.trim(),
        targetScope: apiScope,
        targetRegion: scope === 'region' ? targetRegion : null,
        targetCampus: scope === 'campus' ? targetCampus : null,
        targetMentorId: (scope === 'individual' || scope === 'individual_rh') ? apiMentorId : null,
      }
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success(editDirective ? 'Directive updated' : 'Directive published!')
      setShowCreate(false)
      setEditDirective(null)
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

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return
    const r = await fetch(`/api/directives/${id}?permanent=true`, { method: 'DELETE' })
    if (r.ok) { toast.success('Directive deleted'); await fetchDirectives() }
    else { toast.error('Failed to delete directive') }
  }

  const active = directives.filter((d) => d.isActive)
  const archived = directives.filter((d) => !d.isActive)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monthly Directives</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" /> New Directive
        </Button>
      </div>

      {/* Active */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Active</h2>
        {loading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)
        ) : active.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 py-4">No active directives</p>
        ) : active.map((d) => (
          <Card key={d._id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{d.title}</p>
                    <DirectiveBadge d={d} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{d.content}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Expires {formatDate(d.expiresAt)}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setViewDirective(d)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300" title="View">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300" title="Edit">
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

      {/* Archived */}
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
                <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300" title="Edit & re-archive">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleRestore(d._id)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-950 rounded text-gray-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400" title="Restore directive">
                  <ArchiveRestore className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(d._id, d.title)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 rounded text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400" title="Delete permanently">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View modal */}
      {viewDirective && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewDirective(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 p-6 pb-3 border-b dark:border-slate-700 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={viewDirective.isActive ? 'success' : 'secondary'}>{viewDirective.isActive ? 'Active' : 'Archived'}</Badge>
                  <DirectiveBadge d={viewDirective} />
                </div>
                <h2 className="text-xl font-bold">{viewDirective.title}</h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Published {formatDate(viewDirective.publishedAt)} · Expires {formatDate(viewDirective.expiresAt)}
                </p>
              </div>
              <button onClick={() => setViewDirective(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 pt-4">
              <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{viewDirective.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditDirective(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDirective ? 'Edit Directive' : 'Publish New Directive'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Directive title" />
            </div>
            <div className="space-y-1.5">
              <Label>Content *</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="h-32" placeholder="Write your directive here..." />
            </div>
            <div className="space-y-1.5">
              <Label>Target</Label>
              <Select value={scope} onValueChange={(v) => { setScope(v as FormScope); setTargetRegion(''); setTargetCampus(''); setTargetMentorId('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Mentors</SelectItem>
                  <SelectItem value="regional_head">All Regional Heads</SelectItem>
                  <SelectItem value="individual_rh">Individual Regional Head</SelectItem>
                  <SelectItem value="region">Mentors — By Region</SelectItem>
                  <SelectItem value="campus">Mentors — By Campus</SelectItem>
                  <SelectItem value="individual">Individual Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === 'region' && (
              <div className="space-y-1.5">
                <Label>Region *</Label>
                <Select value={targetRegion} onValueChange={setTargetRegion}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => <SelectItem key={r} value={r}>{REGIONS_LABELS[r] ?? r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'campus' && (
              <div className="space-y-1.5">
                <Label>Campus *</Label>
                <Select value={targetCampus} onValueChange={setTargetCampus}>
                  <SelectTrigger><SelectValue placeholder={campuses.length === 0 ? 'Loading campuses…' : 'Select campus'} /></SelectTrigger>
                  <SelectContent>
                    {campuses.map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'individual_rh' && (
              <div className="space-y-1.5">
                <Label>Regional Head *</Label>
                <Select value={targetMentorId} onValueChange={setTargetMentorId}>
                  <SelectTrigger><SelectValue placeholder={rhUsers.length === 0 ? 'Loading…' : 'Select regional head'} /></SelectTrigger>
                  <SelectContent>
                    {rhUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'individual' && (
              <div className="space-y-1.5">
                <Label>Mentor *</Label>
                <Select value={targetMentorId} onValueChange={setTargetMentorId}>
                  <SelectTrigger><SelectValue placeholder={mentorUsers.length === 0 ? 'Loading mentors…' : 'Select mentor'} /></SelectTrigger>
                  <SelectContent>
                    {mentorUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditDirective(null) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}>
              {saving ? 'Saving...' : editDirective ? 'Update' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
