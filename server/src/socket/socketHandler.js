
// Phase 2 Enhanced Socket.IO Handler for Advanced Collaboration
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { sanitizeParams } from '../utils/sql.js';

const onlineUsers = new Map(); // userId -> { socketId, userInfo, workspaceId, currentPage }
const collaborativeSessions = new Map(); // roomId -> Set<userId>

export function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

export function getWorkspacePresence(workspaceId) {
  const users = [];
  onlineUsers.forEach((userInfo, userId) => {
    if (userInfo.workspaceId === workspaceId) {
      users.push({
        userId,
        currentPage: userInfo.currentPage,
        lastActivity: userInfo.lastActivity
      });
    }
  });
  return users;
}

export default function socketHandler(io) {
  // Authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    try {
      const user = jwt.verify(token, process.env.JWT || 'your_jwt_secret');
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user?.id;
    if (!userId) return;

    console.log(`🔗 User ${userId} connected`);

    // Update user online status in database
    try {
  await pool.execute(
        'UPDATE users SET is_online = true, last_seen = NOW() WHERE id = ?',
        sanitizeParams([userId])
      );
    } catch (error) {
      console.error('Failed to update user online status:', error);
    }

    // ===========================================
    // PHASE 2: USER PRESENCE EVENTS
    // ===========================================

    // User joins a page/workspace
    socket.on('user:join', async ({ workspaceId, currentPage }) => {
      try {
        // Update online users map
        onlineUsers.set(userId, {
          socketId: socket.id,
          workspaceId,
          currentPage,
          lastActivity: new Date()
        });

        // Update database presence
    await database.execute(`
          INSERT INTO user_presence (user_id, workspace_id, current_page, last_activity, is_online)
          VALUES (?, ?, ?, NOW(), true)
          ON DUPLICATE KEY UPDATE
          workspace_id = VALUES(workspace_id),
          current_page = VALUES(current_page),
          last_activity = VALUES(last_activity),
          is_online = VALUES(is_online)
    `, sanitizeParams([userId, workspaceId, currentPage]));

        // Join workspace room
        socket.join(`workspace:${workspaceId}`);
        
        // Broadcast presence update to workspace
        socket.to(`workspace:${workspaceId}`).emit('presence:update', {
          userId,
          action: 'join',
          currentPage,
          timestamp: new Date()
        });

        console.log(`👤 User ${userId} joined workspace ${workspaceId} on page ${currentPage}`);
      } catch (error) {
        console.error('user:join error:', error);
      }
    });

    // User leaves a page/workspace
    socket.on('user:leave', async ({ workspaceId }) => {
      try {
        // Remove from online users
        onlineUsers.delete(userId);

        // Update database
          await database.execute(
            'UPDATE user_presence SET is_online = false, last_activity = NOW() WHERE user_id = ?',
            sanitizeParams([userId])
          );

        // Leave workspace room
        socket.leave(`workspace:${workspaceId}`);

        // Broadcast presence update
        socket.to(`workspace:${workspaceId}`).emit('presence:update', {
          userId,
          action: 'leave',
          timestamp: new Date()
        });

        console.log(`👤 User ${userId} left workspace ${workspaceId}`);
      } catch (error) {
        console.error('user:leave error:', error);
      }
    });

    // User activity tracking
    socket.on('user:activity', async ({ workspaceId, activity, metadata }) => {
      try {
        const userInfo = onlineUsers.get(userId);
        if (userInfo) {
          userInfo.lastActivity = new Date();
          
          // Update database
            await database.execute(
              'UPDATE user_presence SET last_activity = NOW(), session_data = ? WHERE user_id = ?',
              sanitizeParams([JSON.stringify({ activity, metadata }), userId])
            );

          // Broadcast activity to workspace
          socket.to(`workspace:${workspaceId}`).emit('presence:update', {
            userId,
            action: 'activity',
            activity,
            metadata,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('user:activity error:', error);
      }
    });

    // ===========================================
    // PHASE 2: UNIVERSAL COMMENTS EVENTS
    // ===========================================

    // Create new comment
    socket.on('comment:create', async ({ itemType, itemId, content, parentId = null }) => {
      try {
        const [result] = await database.execute(`
          INSERT INTO comments (content, commentable_type, commentable_id, created_by, parent_id)
          VALUES (?, ?, ?, ?, ?)
        `, sanitizeParams([content, itemType, itemId, userId, parentId]));

        const commentId = result.insertId;

    // Get the created comment with user info
  const [commentRows] = await database.execute(`
          SELECT c.*, u.username, u.profile_picture, u.first_name, u.last_name
          FROM comments c
          JOIN users u ON c.created_by = u.id
          WHERE c.id = ?
  `, sanitizeParams([commentId]));

        const comment = commentRows[0];

        // Broadcast to item room
        const roomId = `${itemType}:${itemId}`;
        io.to(roomId).emit('comment:created', {
          comment,
          timestamp: new Date()
        });

        console.log(`💬 Comment created on ${itemType}:${itemId} by user ${userId}`);
      } catch (error) {
        console.error('comment:create error:', error);
        socket.emit('error', { message: 'Failed to create comment' });
      }
    });

    // Update comment
    socket.on('comment:update', async ({ commentId, content }) => {
      try {
        // Verify ownership
        const [commentRows] = await database.execute(
          'SELECT * FROM comments WHERE id = ? AND created_by = ?',
          sanitizeParams([commentId, userId])
        );

        if (commentRows.length === 0) {
          socket.emit('error', { message: 'Comment not found or permission denied' });
          return;
        }

        const comment = commentRows[0];

        // Update comment
          await database.execute(
            'UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?',
            sanitizeParams([content, commentId])
          );

        // Broadcast to item room
        const roomId = `${comment.commentable_type}:${comment.commentable_id}`;
        io.to(roomId).emit('comment:updated', {
          commentId,
          content,
          updatedAt: new Date(),
          userId
        });

        console.log(`💬 Comment ${commentId} updated by user ${userId}`);
      } catch (error) {
        console.error('comment:update error:', error);
        socket.emit('error', { message: 'Failed to update comment' });
      }
    });

    // Delete comment
    socket.on('comment:delete', async ({ commentId }) => {
      try {
        // Verify ownership
        const [commentRows] = await database.execute(
          'SELECT * FROM comments WHERE id = ? AND created_by = ?',
          [commentId, userId]
        );

        if (commentRows.length === 0) {
          socket.emit('error', { message: 'Comment not found or permission denied' });
          return;
        }

        const comment = commentRows[0];

        // Delete comment
    await database.execute('DELETE FROM comments WHERE id = ?', sanitizeParams([commentId]));

        // Broadcast to item room
        const roomId = `${comment.commentable_type}:${comment.commentable_id}`;
        io.to(roomId).emit('comment:deleted', {
          commentId,
          userId,
          timestamp: new Date()
        });

        console.log(`💬 Comment ${commentId} deleted by user ${userId}`);
      } catch (error) {
        console.error('comment:delete error:', error);
        socket.emit('error', { message: 'Failed to delete comment' });
      }
    });

    // Add/remove comment reaction
    socket.on('comment:react', async ({ commentId, emoji, action }) => {
      try {
        if (action === 'add') {
          await database.execute(`
            INSERT IGNORE INTO comment_reactions (comment_id, user_id, emoji)
            VALUES (?, ?, ?)
          `, [commentId, userId, emoji]);
        } else if (action === 'remove') {
          await database.execute(
            'DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?',
            [commentId, userId, emoji]
          );
        }

        // Get updated reaction counts
        const [reactionRows] = await database.execute(`
          SELECT emoji, COUNT(*) as count
          FROM comment_reactions
          WHERE comment_id = ?
          GROUP BY emoji
        `, [commentId]);

        // Get comment details for broadcasting
        const [commentRows] = await database.execute(
          'SELECT commentable_type, commentable_id FROM comments WHERE id = ?',
          [commentId]
        );

        if (commentRows.length > 0) {
          const comment = commentRows[0];
          const roomId = `${comment.commentable_type}:${comment.commentable_id}`;
          
          io.to(roomId).emit('reaction:updated', {
            commentId,
            reactions: reactionRows,
            userId,
            action,
            emoji,
            timestamp: new Date()
          });
        }

        console.log(`🎭 Reaction ${action}: ${emoji} on comment ${commentId} by user ${userId}`);
      } catch (error) {
        console.error('comment:react error:', error);
        socket.emit('error', { message: 'Failed to update reaction' });
      }
    });

    // ===========================================
    // PHASE 2: COLLABORATIVE TASK EVENTS
    // ===========================================

    // User starts editing task
    socket.on('task:join', async ({ taskId }) => {
      try {
        const roomId = `task:${taskId}`;
        socket.join(roomId);

        if (!collaborativeSessions.has(roomId)) {
          collaborativeSessions.set(roomId, new Set());
        }
        collaborativeSessions.get(roomId).add(userId);

        // Store in database
        await database.execute(
          'INSERT INTO collaborative_sessions (item_type, item_id, user_id, is_active) VALUES (\'task\', ?, ?, true) ON DUPLICATE KEY UPDATE is_active = true, updated_at = NOW()',
          sanitizeParams([taskId, userId])
        );

        // Broadcast to others in the room
        socket.to(roomId).emit('user:joined_editing', {
          userId,
          itemType: 'task',
          itemId: taskId,
          timestamp: new Date()
        });

        console.log(`📝 User ${userId} started editing task ${taskId}`);
      } catch (error) {
        console.error('task:join error:', error);
      }
    });

    // User stops editing task
    socket.on('task:leave', async ({ taskId }) => {
      try {
        const roomId = `task:${taskId}`;
        socket.leave(roomId);

        // Remove from collaborative sessions
        if (collaborativeSessions.has(roomId)) {
          collaborativeSessions.get(roomId).delete(userId);
        }

        // Update database
          await database.execute(
            'UPDATE collaborative_sessions SET is_active = false WHERE item_type = ? AND item_id = ? AND user_id = ?',
            sanitizeParams(['task', taskId, userId])
          );

        // Broadcast to others
        socket.to(roomId).emit('user:left_editing', {
          userId,
          itemType: 'task',
          itemId: taskId,
          timestamp: new Date()
        });

        console.log(`📝 User ${userId} stopped editing task ${taskId}`);
      } catch (error) {
        console.error('task:leave error:', error);
      }
    });

    // Task field updated
    socket.on('task:update', ({ taskId, field, value, version }) => {
      const roomId = `task:${taskId}`;
      
      // Broadcast optimistic update to others
      socket.to(roomId).emit('task:field_updated', {
        taskId,
        field,
        value,
        version,
        userId,
        timestamp: new Date()
      });

      console.log(`📝 Task ${taskId} field '${field}' updated by user ${userId}`);
    });

    // Sync task changes
    socket.on('task:sync', async ({ taskId, changes }) => {
      try {
        const roomId = `task:${taskId}`;
        
        // Update collaborative session
        await database.execute(
          'UPDATE collaborative_sessions SET session_data = ?, updated_at = NOW() WHERE item_type = ? AND item_id = ? AND user_id = ?',
          [JSON.stringify(changes), 'task', taskId, userId]
        );

        // Broadcast sync to others
        socket.to(roomId).emit('task:synced', {
          taskId,
          changes,
          userId,
          timestamp: new Date()
        });

        console.log(`📝 Task ${taskId} synced by user ${userId}`);
      } catch (error) {
        console.error('task:sync error:', error);
      }
    });

    // ===========================================
    // PHASE 2: REAL-TIME REACTIONS EVENTS
    // ===========================================

    // Add emoji reaction
    socket.on('reaction:add', ({ itemType, itemId, emoji, coordinates }) => {
      const roomId = `${itemType}:${itemId}`;
      
      // Broadcast reaction to room
      io.to(roomId).emit('reaction:broadcast', {
        userId,
        emoji,
        coordinates,
        itemType,
        itemId,
        timestamp: new Date()
      });

      console.log(`🎭 Reaction ${emoji} added to ${itemType}:${itemId} by user ${userId}`);
    });

    // ===========================================
    // ENHANCED EXISTING EVENTS
    // ===========================================

    // Join a room for a specific resource (enhanced)
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      
      // Add to collaborative sessions if it's an editable item
      if (roomId.includes(':')) {
        if (!collaborativeSessions.has(roomId)) {
          collaborativeSessions.set(roomId, new Set());
        }
        collaborativeSessions.get(roomId).add(userId);
      }

      io.to(roomId).emit('userJoinedRoom', { 
        userId, 
        roomId,
        timestamp: new Date()
      });
    });

    // Enhanced cursor updates with collaborative session tracking
    socket.on('cursorUpdate', async ({ roomId, cursor, selection, userInfo }) => {
      try {
        // Update cursor position in database if it's a collaborative session
        if (roomId.includes(':')) {
          const [itemType, itemId] = roomId.split(':');
          await database.execute(`
            UPDATE collaborative_sessions 
            SET cursor_position = ?, updated_at = NOW() 
            WHERE item_type = ? AND item_id = ? AND user_id = ? AND is_active = true
          `, [JSON.stringify({ cursor, selection }), itemType, itemId, userId]);
        }

        socket.to(roomId).emit('cursorUpdate', {
          userId,
          cursor,
          selection,
          userInfo,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('cursorUpdate error:', error);
      }
    });

    // Enhanced disconnect handling
    socket.on('disconnect', async () => {
      try {
        console.log(`🔌 User ${userId} disconnected`);

        // Update user offline status
        await database.execute(
          'UPDATE users SET is_online = false, last_seen = NOW() WHERE id = ?',
          [userId]
        );

        // Update presence
        await database.execute(
          'UPDATE user_presence SET is_online = false, last_activity = NOW() WHERE user_id = ?',
          [userId]
        );

        // Clean up collaborative sessions
        await database.execute(
          'UPDATE collaborative_sessions SET is_active = false WHERE user_id = ?',
          [userId]
        );

        // Remove from online users
        const userInfo = onlineUsers.get(userId);
        if (userInfo) {
          // Broadcast offline status to workspace
          socket.to(`workspace:${userInfo.workspaceId}`).emit('presence:update', {
            userId,
            action: 'offline',
            timestamp: new Date()
          });
        }
        onlineUsers.delete(userId);

        // Clean up collaborative sessions map
        collaborativeSessions.forEach((userSet, roomId) => {
          userSet.delete(userId);
          if (userSet.size === 0) {
            collaborativeSessions.delete(roomId);
          }
        });

        // Broadcast offline status
        io.emit('userOffline', userId);
      } catch (error) {
        console.error('disconnect error:', error);
      }
    });
  });
}
