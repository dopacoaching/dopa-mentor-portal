'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, MapPin, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { apiPost, apiPut, apiDelete } from '@/lib/client/api'

const REGIONS = [
  { value: 'Calicut', label: 'Calicut' },
  { value: 'Kottakkal', label: 'Kottakkal' },
  { value: 'Thrissur', label: 'Thrissur' },
  { value: 'IG', label: 'Integrated School (IG)' },
]

const BATCH_TYPE_LABELS: Record<string, string> = {
  residential: 'Residential',
  online: 'Online',
  offline: 'Offline',
  ig: 'Integrated (IG)',
}

interface CampusBatch { batchId: string; batchName: string; batchType: string }
interface Campus { _id: string; name: string; region: string; batches: CampusBatch[] }

function BatchRows({
  batches,
  onChange,
}: {
  batches: { batchName: string; batchType: string }[]
  onChange: (b: { batchName: string; batchType: string }[]) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Batches</Label>
        <button
          type="button"
          onClick={() => onChange([...batches, { batchName: '', batchType: 'residential' }])}
          className="text-xs text-dopa-green hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Batch
        </button>
      </div>
      {batches.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-slate-500">No batches yet — click Add Batch.</p>
      )}
      {batches.map((b, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs text-gray-500 dark:text-slate-400">Batch Name</Label>}
            <Input
              value={b.batchName}
              onChange={(e) => {
                const next = [...batches]
                next[i] = { ...next[i], batchName: e.target.value }
                onChange(next)
              }}
              placeholder="e.g. NEET 2025 Batch A"
            />
          </div>
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs text-gray-500 dark:text-slate-400">Type</Label>}
            <Select
              value={b.batchType}
              onValueChange={(v) => {
                const next = [...batches]
                next[i] = { ...next[i], batchType: v }
                onChange(next)
              }}
            >
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="ig">Integrated (IG)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            onClick={() => onChange(batches.filter((_, j) => j !== i))}
            className={`p-2 rounded hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 ${i === 0 ? 'mt-5' : ''}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [loading, setLoading] = useState(true)

  // Add form state
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [newBatches, setNewBatches] = useState<{ batchName: string; batchType: string }[]>([])
  const [saving, setSaving] = useState(false)

  // Edit batches dialog state
  const [editCampus, setEditCampus] = useState<Campus | null>(null)
  const [editBatches, setEditBatches] = useState<{ batchName: string; batchType: string }[]>([])
  const [editSaving, setEditSaving] = useState(false)

  const fetchCampuses = useCallback(async () => {
    const r = await fetch('/api/campuses')
    const d = await r.json()
    setCampuses(d.campuses ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCampuses() }, [fetchCampuses])

  async function handleAdd() {
    if (!name.trim() || !region) { toast.error('Name and region are required'); return }
    setSaving(true)
    try {
      const { ok, data: d } = await apiPost<{ error?: string }>('/api/campuses', { name: name.trim(), region, batches: newBatches })
      if (!ok) { toast.error(d.error); return }
      toast.success('Campus added')
      setName('')
      setRegion('')
      setNewBatches([])
      await fetchCampuses()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, campusName: string) {
    if (!window.confirm(`Remove "${campusName}"? This cannot be undone.`)) return
    const { ok } = await apiDelete(`/api/campuses/${id}`)
    if (ok) { toast.success(`${campusName} removed`); await fetchCampuses() }
    else { toast.error('Failed to remove campus') }
  }

  function openEdit(campus: Campus) {
    setEditCampus(campus)
    setEditBatches(campus.batches.map((b) => ({ batchName: b.batchName, batchType: b.batchType })))
  }

  async function handleSaveBatches() {
    if (!editCampus) return
    setEditSaving(true)
    try {
      const { ok, data: d } = await apiPut<{ error?: string }>(`/api/campuses/${editCampus._id}`, { batches: editBatches })
      if (!ok) { toast.error(d.error); return }
      toast.success('Batches updated')
      setEditCampus(null)
      await fetchCampuses()
    } finally { setEditSaving(false) }
  }

  const grouped = REGIONS.map((r) => ({
    ...r,
    campuses: campuses.filter((c) => c.region?.toLowerCase() === r.value.toLowerCase()),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Campus Management</h1>

      {/* Add form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 p-5 space-y-4">
        <h2 className="font-semibold text-sm text-gray-700 dark:text-slate-300">Add New Campus</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Region *</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Campus Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Calicut Main Campus"
            />
          </div>
        </div>
        <BatchRows batches={newBatches} onChange={setNewBatches} />
        <Button onClick={handleAdd} disabled={saving || !name.trim() || !region}>
          <Plus className="w-4 h-4 mr-1.5" /> {saving ? 'Adding...' : 'Add Campus'}
        </Button>
      </div>

      {/* Campus list grouped by region */}
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)
        ) : (
          grouped.map((group) => (
            <div key={group.value} className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <span className="font-semibold text-sm">{group.label}</span>
                <Badge variant="secondary" className="ml-auto">{group.campuses.length}</Badge>
              </div>
              {group.campuses.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400 dark:text-slate-500">No campuses added yet</p>
              ) : (
                <ul className="divide-y dark:divide-slate-700">
                  {group.campuses.map((c) => (
                    <li key={c._id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{c.name}</p>
                          {c.batches && c.batches.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {c.batches.map((b, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                                  {b.batchName}
                                  <span className="text-gray-400 dark:text-slate-500">· {BATCH_TYPE_LABELS[b.batchType] ?? b.batchType}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">No batches — click edit to add</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                            title="Manage batches"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c._id, c.name)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                            title="Remove campus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit batches dialog */}
      <Dialog open={!!editCampus} onOpenChange={(o) => { if (!o) setEditCampus(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Batches — {editCampus?.name}</DialogTitle>
          </DialogHeader>
          <BatchRows batches={editBatches} onChange={setEditBatches} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCampus(null)}>Cancel</Button>
            <Button onClick={handleSaveBatches} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Batches'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
