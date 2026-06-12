'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatRelativeTime } from '@/lib/utils'

interface AuditEntry {
  _id: string
  userId: string
  userName: string
  userRole: string
  action: string
  targetType: string | null
  targetId: string | null
  details: Record<string, unknown>
  ip: string | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  'user.login': 'Logged in',
  'user.create': 'Created user',
  'user.update': 'Updated user',
  'user.delete': 'Deleted user',
  'task.submit': 'Submitted tasks',
  'task.verified': 'Verified tasks',
  'task.flagged': 'Flagged tasks',
  'doubt.log': 'Logged doubts',
  'visit.schedule': 'Scheduled visit',
  'visit.confirm': 'Confirmed visit',
  'visit.request_change': 'Requested visit change',
  'visit.mentor_report': 'Submitted visit report',
  'visit.ct_review': 'Submitted CT review',
  'directive.create': 'Created directive',
  'directive.update': 'Updated directive',
  'directive.archive': 'Archived directive',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  class_teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  mentor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  update: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  archive: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  submit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  flagged: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  log: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  schedule: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  confirm: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  request_change: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  mentor_report: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ct_review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

function getActionColor(action: string) {
  const verb = action.split('.')[1] ?? ''
  return ACTION_COLORS[verb] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return <span className="text-gray-400 dark:text-slate-600">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-0.5 text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded px-1.5 py-0.5">
          <span className="font-medium text-gray-500 dark:text-slate-500">{k}:</span>
          <span>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
        </span>
      ))}
    </div>
  )
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterAction, setFilterAction] = useState('all')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (search) params.set('search', search)
      if (filterRole !== 'all') params.set('userRole', filterRole)
      if (filterAction !== 'all') params.set('action', filterAction)
      const r = await fetch(`/api/admin/audit?${params}`)
      const d = await r.json()
      setLogs(d.logs ?? [])
      setTotal(d.total ?? 0)
      setPages(d.pages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterRole, filterAction])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => { setPage(1) }, [search, filterRole, filterAction])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{total.toLocaleString()} events recorded</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
          <Input
            className="pl-8"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="class_teacher">Class Teacher</SelectItem>
            <SelectItem value="mentor">Mentor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.keys(ACTION_LABELS).map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400 hidden lg:table-cell">Details</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400 dark:text-slate-500">
                    No audit events found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-sm">{log.userName}</p>
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${ROLE_COLORS[log.userRole] ?? ''}`}>
                            {log.userRole.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${getActionColor(log.action)}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                      <DetailsCell details={log.details} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 dark:text-slate-500 whitespace-nowrap text-xs">
                      {formatRelativeTime(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pages || loading}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
