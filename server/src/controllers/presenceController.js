// Phase 2 Presence API Controller
import { pool } from '../config/database.js';
import { getWorkspacePresence } from '../socket/socketHandler.js';

// Get workspace presence
export const getWorkspacePresenceController = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Get real-time presence from Socket.IO
    const realtimePresence = getWorkspacePresence(parseInt(workspaceId));

    // Get database presence for offline users
  const [dbPresence] = await pool.execute(`
      SELECT 
        up.user_id,
        up.current_page,
        up.last_activity,
        up.is_online,
        up.session_data,
        u.username,
        u.first_name,
        u.last_name,
        u.profile_picture
      FROM user_presence up
      JOIN users u ON up.user_id = u.id
      WHERE up.workspace_id = ?
      ORDER BY up.last_activity DESC
    `, [workspaceId]);

    // Merge real-time and database presence
    const presenceMap = new Map();
    
    // Add database presence
    dbPresence.forEach(user => {
      presenceMap.set(user.user_id, {
        userId: user.user_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePicture: user.profile_picture,
        currentPage: user.current_page,
        lastActivity: user.last_activity,
        isOnline: user.is_online,
        sessionData: user.session_data
      });
    });

    // Update with real-time presence
    realtimePresence.forEach(user => {
      if (presenceMap.has(user.userId)) {
        const existing = presenceMap.get(user.userId);
        existing.currentPage = user.currentPage;
        existing.lastActivity = user.lastActivity;
        existing.isOnline = true;
      }
    });

    const presence = Array.from(presenceMap.values());

    res.json({
      success: true,
      presence,
      onlineCount: presence.filter(u => u.isOnline).length,
      totalCount: presence.length
    });
  } catch (error) {
    console.error('Get workspace presence error:', error);
    res.status(500).json({ success: false, message: 'Failed to get workspace presence' });
  }
};

// Update user presence
export const updateUserPresence = async (req, res) => {
  try {
    const { workspaceId, currentPage, activity } = req.body;
    const userId = req.user.id;

  await pool.execute(`
      INSERT INTO user_presence (user_id, workspace_id, current_page, last_activity, is_online, session_data)
      VALUES (?, ?, ?, NOW(), true, ?)
      ON DUPLICATE KEY UPDATE
      workspace_id = VALUES(workspace_id),
      current_page = VALUES(current_page),
      last_activity = VALUES(last_activity),
      is_online = VALUES(is_online),
      session_data = VALUES(session_data)
    `, [userId, workspaceId, currentPage, JSON.stringify({ activity })]);

    res.json({
      success: true,
      message: 'Presence updated successfully'
    });
  } catch (error) {
    console.error('Update presence error:', error);
    res.status(500).json({ success: false, message: 'Failed to update presence' });
  }
};

// Get user's current presence
export const getUserPresence = async (req, res) => {
  try {
    const { userId } = req.params;

  const [presence] = await pool.execute(`
      SELECT 
        up.*,
        u.username,
        u.first_name,
        u.last_name,
        u.profile_picture,
        w.name as workspace_name
      FROM user_presence up
      JOIN users u ON up.user_id = u.id
      JOIN workspaces w ON up.workspace_id = w.id
      WHERE up.user_id = ?
    `, [userId]);

    if (presence.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User presence not found'
      });
    }

    res.json({
      success: true,
      presence: presence[0]
    });
  } catch (error) {
    console.error('Get user presence error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user presence' });
  }
};
