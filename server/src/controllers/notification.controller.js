import Notification from "../models/Notification.js";

export async function getMyNotifications(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false
    });

    return res.json({ data: notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, user: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.json({ message: "Notification marked as read.", data: notification });
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({ message: "All notifications marked as read." });
  } catch (error) {
    return next(error);
  }
}
