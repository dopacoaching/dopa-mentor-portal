import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { NotificationState, INotification } from '@/types'

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
}

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<INotification>) {
      state.items.unshift(action.payload)
      if (!action.payload.isRead) {
        state.unreadCount += 1
      }
    },
    setNotifications(state, action: PayloadAction<INotification[]>) {
      state.items = action.payload
      state.unreadCount = action.payload.filter((n) => !n.isRead).length
    },
    markAllRead(state) {
      state.items = state.items.map((n) => ({ ...n, isRead: true }))
      state.unreadCount = 0
    },
    markRead(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n._id === action.payload)
      if (item && !item.isRead) {
        item.isRead = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    clearNotifications(state) {
      state.items = []
      state.unreadCount = 0
    },
  },
})

export const {
  addNotification,
  setNotifications,
  markAllRead,
  markRead,
  clearNotifications,
} = notificationSlice.actions
export default notificationSlice.reducer
