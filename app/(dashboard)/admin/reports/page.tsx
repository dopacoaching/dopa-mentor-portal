'use client'

import { useState } from 'react'
import { BarChart2, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function AdminReportsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [mentorId, setMentorId] = useState('')
  const [campus, setCampus] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  async function handleDownload(type: string) {
    setLoading(type)
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) })
      if (mentorId) params.set('mentorId', mentorId)
      if (campus) params.set('campus', campus)

      const r = await fetch(`/api/reports/${type}?${params}`)
      if (!r.ok) { toast.error('Failed to generate report'); return }

      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-${MONTHS[month - 1].toLowerCase()}-${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded!')
    } catch { toast.error('Failed to generate report') }
    finally { setLoading(null) }
  }

  const reports = [
    { type: 'mentor-performance', title: 'Mentor-Wise Performance Summary', description: 'Full activity report for a specific mentor this month', needsMentor: true },
    { type: 'batch-compliance', title: 'Batch-Wise Compliance Report', description: 'Task compliance % for all mentors in a batch', needsCampus: true },
    { type: 'payment-summary', title: 'Monthly Payment Summary', description: 'All mentors with payment breakdown' },
    { type: 'visit-log', title: 'Campus Visit Log', description: 'All visits for a campus this month', needsCampus: true },
    { type: 'ct-reviews', title: 'CT Review Compilation', description: 'All CT visit reviews (admin only)', needsMentor: true },
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="bg-white rounded-xl border p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Global Filters</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Month</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mentor ID (optional)</Label>
            <Input value={mentorId} onChange={(e) => setMentorId(e.target.value)} placeholder="Mentor ID" className="w-48" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Campus (optional)</Label>
            <Input value={campus} onChange={(e) => setCampus(e.target.value)} placeholder="Campus name" className="w-48" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.type}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-dopa-light flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="w-4 h-4 text-dopa-green" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{report.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    disabled={loading === report.type}
                    onClick={() => handleDownload(report.type)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    {loading === report.type ? 'Generating...' : 'Generate PDF'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
