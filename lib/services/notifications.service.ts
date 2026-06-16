import { connectDB } from '@/lib/mongodb'
import Notification from '@/models/Notification'

/** Most recent notifications for a recipient (limit clamped 1..100). */
export async function listNotifications(recipientId: string, limit: number) {
  await connectDB()
  const safeLimit = Math.min(100, Math.max(1, limit))
  return Notification.find({ recipientId }).sort({ createdAt: -1 }).limit(safeLimit)
}

/** Marks one notification (by id) or all of the recipient's notifications as read. */
export async function markNotificationsRead(recipientId: string, id?: string) {
  await connectDB()
  if (id) {
    await Notification.findOneAndUpdate({ _id: id, recipientId }, { isRead: true })
  } else {
    await Notification.updateMany({ recipientId, isRead: false }, { isRead: true })
  }
}
