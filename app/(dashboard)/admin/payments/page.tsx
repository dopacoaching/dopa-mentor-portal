'use client'

import { useEffect, useState } from 'react'
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PaymentBreakdown } from '@/types'

export default function AdminPaymentsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [payments, setPayments] = useState<PaymentBreakdown[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<PaymentBreakdown | null>(null)

  async function fetchPayments() {
    setLoading(true)
    const r = await fetch(`/api/payments/${month}-${year}`)
    const d = await r.json()
    setPayments(d.payments ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPayments() }, [month, year])

  const totalPayout = payments.reduce((sum, p) => sum + p.total, 0)

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Payment Summary</h1>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-100">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-100">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-dopa-light dark:bg-slate-800 border border-dopa-green/20 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-dopa-green rounded-xl flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Total Payout — {MONTHS[month - 1]} {year}</p>
          <p className="text-2xl font-bold text-dopa-green">₹{totalPayout.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Mentor</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-3 py-3">Basic</th>
                <th className="text-right px-3 py-3">D-Team</th>
                <th className="text-right px-3 py-3">Doubts</th>
                <th className="text-right px-3 py-3">Travel</th>
                <th className="text-right px-3 py-3">Meeting</th>
                <th className="text-right px-4 py-3 font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" /></td></tr>
                ))
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 dark:text-slate-500">No payment data</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.mentorId} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => setSelected(p)}>
                    <td className="px-4 py-3 font-medium">{p.mentorName}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{p.mentorType}</Badge></td>
                    <td className="text-right px-3 py-3">₹{p.basicPay.toLocaleString()}</td>
                    <td className="text-right px-3 py-3">₹{p.dteamPay.toLocaleString()}</td>
                    <td className="text-right px-3 py-3">₹{(p.doubtWebBase + p.doubtWebExtra).toLocaleString()}</td>
                    <td className="text-right px-3 py-3">₹{p.travelAllowance.toLocaleString()}</td>
                    <td className="text-right px-3 py-3">₹{p.meetingPay.toLocaleString()}</td>
                    <td className="text-right px-4 py-3 font-bold text-dopa-green">₹{p.total.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment Breakdown — {selected?.mentorName}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {[
                { label: 'Basic Pay', value: selected.basicPay },
                { label: selected.mentorType === 'online' ? 'WhatsApp Activities' : 'D-Team Pay', value: selected.dteamPay },
                { label: 'Doubt Web Base (300 quota)', value: selected.doubtWebBase },
                { label: 'Doubt Web Extra', value: selected.doubtWebExtra },
                { label: selected.mentorType === 'online' ? 'Session Pay (Quiz + 1-on-1)' : 'Travel Allowance', value: selected.travelAllowance },
                { label: 'Meeting Attendance', value: selected.meetingPay },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2 border-b dark:border-slate-700 last:border-0">
                  <span className="text-gray-600 dark:text-slate-400">{row.label}</span>
                  <span className={`font-medium ${row.value > 0 ? 'text-green-700 dark:text-green-300' : 'text-gray-400 dark:text-slate-500'}`}>₹{row.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 font-bold text-base border-t-2 dark:border-slate-600 mt-2">
                <span>Total</span>
                <span className="text-dopa-green">₹{selected.total.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-gray-500 dark:text-slate-400">
                <span>Total doubts: {selected.details.totalDoubts}</span>
                <span>Extra doubts: {selected.details.extraDoubts}</span>
                <span>Completed visits: {selected.details.completedVisits}</span>
                <span>Tasks verified: {selected.details.taskVerified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
