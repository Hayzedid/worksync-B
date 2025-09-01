// Phase 2 Collaboration API Controller
import { pool } from '../config/database.js';

// Get collaborative session for an item
export const getCollaborativeSession = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

  const [sessions] = await pool.execute(`
      SELECT 
        cs.*,
        u.username,
        u.first_name,
        u.last_name,
        u.profile_picture
      FROM collaborative_sessions cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.item_type = ? AND cs.item_id = ? AND cs.is_active = true
      ORDER BY cs.updated_at DESC
    `, [itemType, itemId]);

    // Get Y.js document if it exists
  const [yjsDoc] = await pool.execute(
      'SELECT * FROM yjs_documents WHERE item_type = ? AND item_id = ?',
      [itemType, itemId]
    );

    res.json({
      success: true,
      sessions,
      document: yjsDoc[0] || null,
      activeUsers: sessions.length
    });
  } catch (error) {
    console.error('Get collaborative session error:', error);
    res.status(500).json({ success: false, message: 'Failed to get collaborative session' });
  }
};

// Sync document changes
export const syncDocumentChanges = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { changes, version, documentData } = req.body;
    const userId = req.user.id;

    // Update collaborative session
  await pool.execute(`
      INSERT INTO collaborative_sessions (item_type, item_id, user_id, session_data, is_active)
      VALUES (?, ?, ?, ?, true)
      ON DUPLICATE KEY UPDATE
      session_data = VALUES(session_data),
      is_active = VALUES(is_active),
      updated_at = NOW()
    `, [itemType, itemId, userId, JSON.stringify({ changes, version })]);

    // Update or create Y.js document
    const docName = `${itemType}_${itemId}`;
    if (documentData) {
  await pool.execute(`
        INSERT INTO yjs_documents (doc_name, document_data, item_type, item_id, version_vector)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        document_data = VALUES(document_data),
        version_vector = VALUES(version_vector),
        last_modified = NOW()
      `, [docName, documentData, itemType, itemId, JSON.stringify(version)]);
    }

    res.json({
      success: true,
      message: 'Document synced successfully',
      version
    });
  } catch (error) {
    console.error('Sync document error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync document' });
  }
};

// Leave collaborative session
export const leaveCollaborativeSession = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const userId = req.user.id;

  await pool.execute(
      'UPDATE collaborative_sessions SET is_active = false WHERE item_type = ? AND item_id = ? AND user_id = ?',
      [itemType, itemId, userId]
    );

    res.json({
      success: true,
      message: 'Left collaborative session successfully'
    });
  } catch (error) {
    console.error('Leave session error:', error);
    res.status(500).json({ success: false, message: 'Failed to leave session' });
  }
};

// Get collaborative editing history
export const getCollaborationHistory = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { limit = 50 } = req.query;

  const [history] = await pool.execute(`
      SELECT 
        cs.*,
        u.username,
        u.first_name,
        u.last_name
      FROM collaborative_sessions cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.item_type = ? AND cs.item_id = ?
      ORDER BY cs.updated_at DESC
      LIMIT ?
    `, [itemType, itemId, parseInt(limit)]);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Get collaboration history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get collaboration history' });
  }
};
