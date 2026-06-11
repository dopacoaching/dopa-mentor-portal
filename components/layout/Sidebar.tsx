'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CheckSquare, MapPin, MessageSquare,
  FileText, DollarSign, BarChart2, Bell, X, BookOpen, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setSidebarOpen } from '@/store/slices/uiSlice'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['admin'] },
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
  { label: 'Directives', href: '/admin/directives', icon: BookOpen, roles: ['admin'] },
  { label: 'Visits', href: '/admin/visits', icon: MapPin, roles: ['admin'] },
  { label: 'Payments', href: '/admin/payments', icon: DollarSign, roles: ['admin'] },
  { label: 'Reports', href: '/admin/reports', icon: BarChart2, roles: ['admin'] },
  { label: 'Campuses', href: '/admin/campuses', icon: Building2, roles: ['admin'] },

  { label: 'Dashboard', href: '/class-teacher', icon: LayoutDashboard, roles: ['class_teacher'] },
  { label: 'Verify Tasks', href: '/class-teacher/verify', icon: CheckSquare, roles: ['class_teacher'] },
  { label: 'Visits', href: '/class-teacher/visits', icon: MapPin, roles: ['class_teacher'] },
  { label: 'CT Reviews', href: '/class-teacher/reviews', icon: FileText, roles: ['class_teacher'] },

  { label: 'Dashboard', href: '/mentor', icon: LayoutDashboard, roles: ['mentor'] },
  { label: 'Daily Tasks', href: '/mentor/tasks', icon: CheckSquare, roles: ['mentor'] },
  { label: 'Doubt Web', href: '/mentor/doubts', icon: MessageSquare, roles: ['mentor'] },
  { label: 'Visits', href: '/mentor/visits', icon: MapPin, roles: ['mentor'] },
  { label: 'Directives', href: '/mentor/directives', icon: BookOpen, roles: ['mentor'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const role = useAppSelector((s) => s.auth.role)
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen)
  const unreadCount = useAppSelector((s) => s.notification.unreadCount)
  const dispatch = useAppDispatch()

  const items = NAV_ITEMS.filter((item) => role && item.roles.includes(role))

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-30 h-full w-64 bg-dopa-slate flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="bg-white rounded-xl p-1.5 flex-1 mr-2 flex items-center justify-center">
            <Image src="/logo.png" alt="DOPA Mentor Portal" width={40} height={40} className="object-contain" />
          </div>
          <button
            className="lg:hidden text-white/60 hover:text-white"
            onClick={() => dispatch(setSidebarOpen(false))}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-dopa-green text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
                onClick={() => dispatch(setSidebarOpen(false))}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/50 text-xs">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
