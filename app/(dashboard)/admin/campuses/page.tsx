'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const REGIONS = [
  { value: 'calicut', label: 'Calicut' },
  { value: 'kottakkal', label: 'Kottakkal' },
  { value: 'thrissur', label: 'Thrissur' },
  { value: 'ig', label: 'Integrated School (IG)' },
]

interface Campus {
  _id: string
  name: string
  region: string
}

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [saving, setSaving] = useState(false)

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
      const r = await fetch('/api/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), region }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error); return }
      toast.success('Campus added')
      setName('')
      setRegion('')
      await fetchCampuses()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, campusName: string) {
    if (!window.confirm(`Remove "${campusName}"? This cannot be undone.`)) return
    const r = await fetch(`/api/campuses/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success(`${campusName} removed`); await fetchCampuses() }
    else { toast.error('Failed to remove campus') }
  }

  const grouped = REGIONS.map((r) => ({
    ...r,
    campuses: campuses.filter((c) => c.region === r.value),
  }))

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Campus Management</h1>

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
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={saving || !name.trim() || !region}>
          <Plus className="w-4 h-4 mr-1.5" /> {saving ? 'Adding...' : 'Add Campus'}
        </Button>
      </div>

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
                    <li key={c._id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium">{c.name}</span>
                      <button
                        onClick={() => handleDelete(c._id, c.name)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                        title="Remove campus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
