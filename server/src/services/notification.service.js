import Notification from "../models/Notification.js";

export async function createUserNotification({
  userId,
  type = "system",
  title,
  message,
  metadata = {}
}) {
  if (!userId || !title || !message) return null;

  return Notification.create({
    user: userId,
    type,
    title,
    message,
    metadata
  });
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  return Notification.countDocuments({ user: userId, isRead: false });
}
