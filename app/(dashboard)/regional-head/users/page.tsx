'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { IUser } from '@/types'

interface CampusOption { _id: string; name: string; region: string }

function AddTeacherForm({ onSave, onClose }: { onSave: (data: Record<string, unknown>) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [campus, setCampus] = useState('')
  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/campuses')
      .then((r) => r.json())
      .then((d) => setCampusOptions(d.campuses ?? []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !username || !password) { toast.error('All fields are required'); return }
    setSaving(true)
    try {
      await onSave({ name, username, password, role: 'class_teacher', campus: campus || null })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Teacher name" />
        </div>
        <div className="space-y-1.5">
          <Label>Username *</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="login username" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Password *</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Campus</Label>
        <Select value={campus} onValueChange={setCampus}>
          <SelectTrigger><SelectValue placeholder="Select campus (optional)" /></SelectTrigger>
          <SelectContent>
            {campusOptions.map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500">Region will be automatically assigned to your region.</p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Teacher'}</Button>
      </DialogFooter>
    </form>
  )
}

function UserTable({
  users,
  onToggle,
  showBatches,
  emptyMessage,
}: {
  users: IUser[]
  onToggle: (u: IUser) => void
  showBatches?: boolean
  emptyMessage: string
}) {
  if (users.length === 0) {
    return <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-sm">{emptyMessage}</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Username</th>
            <th className="px-4 py-3">Campus</th>
            {showBatches && <th className="px-4 py-3">Batches</th>}
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-700">
          {users.map((u) => (
            <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-medium">{u.name}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{u.username}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{u.campus ?? '—'}</td>
              {showBatches && (
                <td className="px-4 py-3">
                  {u.assignedBatches?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {u.assignedBatches.map((b) => (
                        <span key={b.batchId} className="inline-block text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded px-1.5 py-0.5">
                          {b.batchName}
                        </span>
                      ))}
                    </div>
                  ) : <span className="text-gray-300 dark:text-slate-700">—</span>}
                </td>
              )}
              <td className="px-4 py-3">
                <Badge variant={u.isActive ? 'success' : 'destructive'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onToggle(u)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                  title={u.isActive ? 'Deactivate' : 'Reactivate'}
                >
                  {u.isActive
                    ? <ToggleRight className="w-3.5 h-3.5 text-green-600" />
                    : <ToggleLeft className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RegionalHeadUsersPage() {
  const [teachers, setTeachers] = useState<IUser[]>([])
  const [mentors, setMentors] = useState<IUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const [ctRes, mentorRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/users?role=mentor'),
      ])
      if (!ctRes.ok) throw new Error()
      const [ctData, mentorData] = await Promise.all([ctRes.json(), mentorRes.json()])
      setTeachers(ctData.users ?? [])
      setMentors(mentorData.users ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleCreate(data: Record<string, unknown>) {
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const d = await r.json()
    if (!r.ok) { toast.error(d.error ?? 'Failed to create teacher'); throw new Error(d.error) }
    toast.success('Class teacher created')
    await fetchUsers()
  }

  async function toggleActive(user: IUser) {
    const action = user.isActive ? 'deactivate' : 'reactivate'
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) return
    const r = await fetch(`/api/users/${user._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    if (r.ok) { toast.success(`User ${user.isActive ? 'deactivated' : 'reactivated'}`); await fetchUsers() }
    else { const d = await r.json(); toast.error(d.error ?? 'Failed to update') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Region</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} · {mentors.length} mentor{mentors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Teacher
        </Button>
      </div>

      {error ? (
        <div className="py-20 text-center text-red-500">Failed to load users. Please refresh.</div>
      ) : loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 overflow-hidden">
          <Tabs defaultValue="teachers">
            <div className="px-4 pt-4 border-b dark:border-slate-700">
              <TabsList>
                <TabsTrigger value="teachers">
                  Class Teachers <Badge variant="secondary" className="ml-1.5">{teachers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="mentors">
                  Mentors <Badge variant="secondary" className="ml-1.5">{mentors.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="teachers" className="mt-0">
              <UserTable
                users={teachers}
                onToggle={toggleActive}
                emptyMessage="No class teachers found in your region."
              />
            </TabsContent>
            <TabsContent value="mentors" className="mt-0">
              <UserTable
                users={mentors}
                onToggle={toggleActive}
                showBatches
                emptyMessage="No mentors found in your region."
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Class Teacher</DialogTitle></DialogHeader>
          <AddTeacherForm onSave={handleCreate} onClose={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
