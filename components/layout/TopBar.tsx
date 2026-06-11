'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Menu, LogOut, ChevronRight, Sun, Moon } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { clearAuth } from '@/store/slices/authSlice'
import { clearNotifications } from '@/store/slices/notificationSlice'
import { toggleSidebar } from '@/store/slices/uiSlice'
import { roleLabel } from '@/lib/utils'
import NotificationBell from './NotificationBell'
import { useTheme } from '@/components/ThemeProvider'
import { toast } from 'sonner'

function getBreadcrumb(pathname: string): string[] {
  const parts = pathname.split('/').filter(Boolean)
  return parts.map((p) =>
    p.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { name, role } = useAppSelector((s) => s.auth)
  const { theme, toggleTheme } = useTheme()
  const breadcrumbs = getBreadcrumb(pathname)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    dispatch(clearAuth())
    dispatch(clearNotifications())
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <nav className="hidden sm:flex items-center gap-1 text-sm text-gray-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className={i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="hidden sm:flex flex-col items-end mr-1">
          <span className="text-sm font-medium text-gray-900 dark:text-slate-100 leading-none">{name}</span>
          <span className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{role ? roleLabel(role) : ''}</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 text-gray-500 dark:text-slate-400 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
