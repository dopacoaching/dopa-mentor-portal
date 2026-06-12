'use client'

import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addNotification, setNotifications } from '@/store/slices/notificationSlice'
import { toast } from 'sonner'
import type { INotification } from '@/types'

export function useNotifications() {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const retryDelay = useRef(1000)
  const esRef = useRef<EventSource | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    fetch('/api/notifications?limit=20')
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) dispatch(setNotifications(data.notifications))
      })
      .catch(() => {})

    function connect() {
      const es = new EventSource('/api/notifications/stream')
      esRef.current = es

      es.onopen = () => {
        retryDelay.current = 1000
      }

      es.addEventListener('notification', (e) => {
        try {
          const notification: INotification = JSON.parse(e.data)
          dispatch(addNotification(notification))
          toast.info(notification.message, { duration: 5000 })
        } catch {}
      })

      es.addEventListener('chat_message', (e) => {
        // Dispatch to a window event so the chat page can pick it up
        window.dispatchEvent(new MessageEvent('chat_message', { data: e.data }))
      })

      es.onerror = () => {
        es.close()
        esRef.current = null
        retryTimer.current = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, 30000)
          connect()
        }, retryDelay.current)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [isAuthenticated, dispatch])
}
