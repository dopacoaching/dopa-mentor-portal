'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { markAllRead } from '@/store/slices/notificationSlice'
import { formatRelativeTime } from '@/lib/utils'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dispatch = useAppDispatch()
  const { items, unreadCount } = useAppSelector((s) => s.notification)

  function handleMarkAllRead() {
    dispatch(markAllRead())
    fetch('/api/notifications/mark-read', { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-dopa-green hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No notifications
                </div>
              ) : (
                items.slice(0, 20).map((n) => (
                  <div
                    key={n._id}
                    className={`px-4 py-3 text-sm ${!n.isRead ? 'bg-dopa-light' : ''}`}
                  >
                    <p className={`${!n.isRead ? 'font-medium' : 'text-gray-600'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
