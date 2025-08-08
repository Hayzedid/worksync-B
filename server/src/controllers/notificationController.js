import { getUserNotifications, markNotificationRead } from '../models/Notification.js';

export async function getNotifications(req, res, next) {
  try {
    const notifications = await getUserNotifications(req.user.id);
    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    await markNotificationRead(id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
} 