'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAppDispatch } from '@/store/hooks'
import { setAuth } from '@/store/slices/authSlice'
import { roleDashboard } from '@/lib/utils'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Login failed')
        return
      }
      dispatch(setAuth(data.user))
      toast.success(`Welcome, ${data.user.name}!`)
      router.push(roleDashboard(data.user.role))
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dopa-light px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 pt-8 pb-4 flex justify-center">
            <Image src="/logo.png" alt="DOPA Mentor Portal" width={280} height={100} priority className="object-contain" />
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dopa-green focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dopa-green focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dopa-green text-white py-2.5 rounded-lg font-medium hover:bg-green-800 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">
              DOPA Education Private Limited · Calicut, Kerala
            </p>
            <p className="text-xs text-gray-400 mt-1">
              For access, contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
