'use client'

import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addNotification, setNotifications } from '@/store/slices/notificationSlice'
import { toast } from 'sonner'
import type { INotification } from '@/types'

// Poll interval for new notifications. Short-lived requests instead of a
// persistent SSE stream — this avoids keeping a serverless function provisioned.
const POLL_INTERVAL = 60_000

export function useNotifications() {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const seenIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false

    async function poll() {
      // Skip when the tab is hidden to avoid unnecessary invocations.
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const r = await fetch('/api/notifications?limit=20')
        if (!r.ok) return
        const data = await r.json()
        if (cancelled || !data.notifications) return

        const notifications: INotification[] = data.notifications

        if (!initialized.current) {
          // First load: seed the store without toasting existing notifications.
          dispatch(setNotifications(notifications))
          for (const n of notifications) seenIds.current.add(n._id)
          initialized.current = true
          return
        }

        // Toast + store any notifications we haven't seen yet (oldest first).
        const fresh = notifications.filter((n) => !seenIds.current.has(n._id))
        for (const n of fresh.reverse()) {
          seenIds.current.add(n._id)
          dispatch(addNotification(n))
          toast.info(n.message, { duration: 5000 })
        }
      } catch {
        // Network hiccup — next tick will retry.
      }
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isAuthenticated, dispatch])
}
