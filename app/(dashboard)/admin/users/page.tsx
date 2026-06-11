'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { roleLabel } from '@/lib/utils'
import type { IUser } from '@/types'

const REGIONS = ['calicut', 'kottakkal', 'thrissur', 'ig']
const REGIONS_LABELS: Record<string, string> = { calicut: 'Calicut', kottakkal: 'Kottakkal', thrissur: 'Thrissur', ig: 'Integrated School (IG)' }
const ROLES = ['admin', 'class_teacher', 'mentor']

interface CampusOption { _id: string; name: string; region: string }

function UserForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<IUser>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<IUser['role']>(initial?.role ?? 'mentor')
  const [region, setRegion] = useState(initial?.region ?? '')
  const [campus, setCampus] = useState(initial?.campus ?? '')
  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([])
  const [batchName, setBatchName] = useState(initial?.assignedBatches?.[0]?.batchName ?? '')
  const [batchType, setBatchType] = useState(initial?.assignedBatches?.[0]?.batchType ?? 'residential')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!region) { setCampusOptions([]); setCampus(''); return }
    fetch(`/api/campuses?region=${region}`)
      .then((r) => r.json())
      .then((d) => setCampusOptions(d.campuses ?? []))
  }, [region])

  function handleRegionChange(v: string) {
    setRegion(v)
    setCampus('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { name, role, region: region || null, campus: campus || null }
      if (!initial) { payload.username = username; payload.password = password }
      if (password && initial) payload.newPassword = password
      if (role === 'mentor' && batchName) {
        payload.assignedBatches = [{ batchId: batchName.toLowerCase().replace(/\s+/g, '_'), batchType, batchName }]
      }
      await onSave(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const needsRegionCampus = role === 'class_teacher' || role === 'mentor'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Username *</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required disabled={!!initial} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{initial ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!initial} />
        </div>
        <div className="space-y-1.5">
          <Label>Role *</Label>
          <Select value={role} onValueChange={(v) => { setRole(v as IUser['role']); setRegion(''); setCampus('') }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {needsRegionCampus && (
        <>
          <div className="space-y-1.5">
            <Label>Region *</Label>
            <Select value={region} onValueChange={handleRegionChange}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{REGIONS_LABELS[r] ?? r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Campus *</Label>
            <Select value={campus} onValueChange={setCampus} disabled={!region}>
              <SelectTrigger>
                <SelectValue placeholder={!region ? 'Select region first' : campusOptions.length === 0 ? 'No campuses — add in Campus settings' : 'Select campus'} />
              </SelectTrigger>
              <SelectContent>
                {campusOptions.map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {region && campusOptions.length === 0 && (
              <p className="text-xs text-amber-600">No campuses for this region yet. Add them in <strong>Campuses</strong> settings first.</p>
            )}
          </div>
        </>
      )}
      {role === 'mentor' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Batch Name</Label>
            <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="e.g. NEET 2025 Batch A" />
          </div>
          <div className="space-y-1.5">
            <Label>Batch Type</Label>
            <Select value={batchType} onValueChange={(v) => setBatchType(v as 'residential' | 'online' | 'ig')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="ig">Integrated School (IG)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : initial ? 'Save Changes' : 'Create User'}</Button>
      </DialogFooter>
    </form>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<IUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<IUser | null>(null)

  async function fetchUsers() {
    const r = await fetch('/api/users')
    const d = await r.json()
    setUsers(d.users ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleCreate(data: Record<string, unknown>) {
    const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const d = await r.json()
    if (!r.ok) { toast.error(d.error); throw new Error(d.error) }
    toast.success('User created')
    await fetchUsers()
  }

  async function handleEdit(data: Record<string, unknown>) {
    if (!editUser) return
    const r = await fetch(`/api/users/${editUser._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const d = await r.json()
    if (!r.ok) { toast.error(d.error); throw new Error(d.error) }
    toast.success('User updated')
    await fetchUsers()
  }

  async function toggleActive(user: IUser) {
    const r = await fetch(`/api/users/${user._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !user.isActive }) })
    if (r.ok) { toast.success(`User ${user.isActive ? 'deactivated' : 'reactivated'}`); await fetchUsers() }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add User
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Campus</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{u.username}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{roleLabel(u.role)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 capitalize">{u.region ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{u.campus ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'success' : 'destructive'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditUser(u)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleActive(u)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200" title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                          {u.isActive ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-sm">No users found.</div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <UserForm onSave={handleCreate} onClose={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editUser && (
            <UserForm initial={editUser} onSave={handleEdit} onClose={() => setEditUser(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
