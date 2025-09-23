import { getUserNotifications, markNotificationRead, getUnreadCount } from '../models/Notification.js';

export async function getNotifications(req, res, next) {
  try {
    const { workspace_id } = req.query;
    const notifications = await getUserNotifications(req.user.id, workspace_id);
    const unreadCount = await getUnreadCount(req.user.id);
    
    res.json({ 
      success: true, 
      notifications,
      unreadCount
    });
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