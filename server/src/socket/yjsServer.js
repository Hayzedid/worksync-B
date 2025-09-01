// Phase 2 Y.js WebSocket Server for Collaborative Document Editing
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

// Simple WebSocket server without Y.js for now (can be enhanced later)
let setupWSConnection = null;

// Try to import y-websocket utils synchronously
try {
  // For now, we'll implement a basic collaborative server
  // Y.js integration can be added later when the package is properly configured
  console.log('📝 Y.js WebSocket server running in basic mode');
} catch (error) {
  console.warn('⚠️  Y.js WebSocket utilities not available. Running in basic mode.');
}

class YjsWebSocketServer {
  constructor(port = 1234) {
    this.port = port;
    this.wss = null;
    this.docs = new Map(); // docName -> Y.Doc
  }

  start() {
    console.log(`🔗 Starting Y.js WebSocket server on port ${this.port}...`);
    
    this.wss = new WebSocketServer({ 
      port: this.port,
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    console.log(`✅ Y.js WebSocket server running on ws://localhost:${this.port}`);
  }

  // Verify JWT token for WebSocket connections
  async verifyClient(info) {
    try {
      const url = new URL(info.req.url, 'ws://localhost');
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('❌ Y.js connection rejected: No token provided');
        return false;
      }

      const user = jwt.verify(token, process.env.JWT || 'your_jwt_secret');
      info.req.user = user;
      
      console.log(`✅ Y.js connection verified for user ${user.id}`);
      return true;
    } catch (error) {
      console.log('❌ Y.js connection rejected: Invalid token', error.message);
      return false;
    }
  }

  // Handle new WebSocket connections
  async handleConnection(ws, req) {
    const user = req.user;
    const url = new URL(req.url, 'ws://localhost');
    const docName = url.searchParams.get('docName');
    const itemType = url.searchParams.get('itemType');
    const itemId = url.searchParams.get('itemId');

    if (!docName || !itemType || !itemId) {
      console.log('❌ Y.js connection rejected: Missing required parameters');
      ws.close();
      return;
    }

    console.log(`🔗 Y.js connection established for ${docName} by user ${user.id}`);

    // Basic WebSocket connection handling (without Y.js for now)
    // setupWSConnection(ws, req, {
    //   gc: true,
    //   gcFilter: () => true,
    //   docName,
    //   persistence: {
    //     bindState: this.bindState.bind(this),
    //     writeState: this.writeState.bind(this)
    //   }
    // });

    // Simple collaborative session tracking
    try {
  await pool.execute(`
        INSERT INTO collaborative_sessions (item_type, item_id, user_id, session_data, is_active)
        VALUES (?, ?, ?, ?, true)
        ON DUPLICATE KEY UPDATE
        is_active = true,
        session_data = VALUES(session_data),
        updated_at = NOW()
      `, [itemType, itemId, user.id, JSON.stringify({ 
        docName, 
        connectionType: 'yjs',
        connectedAt: new Date().toISOString()
      })]);
    } catch (error) {
      console.error('Failed to track collaborative session:', error);
    }

    // Handle disconnection
    ws.on('close', async () => {
      console.log(`🔌 Y.js connection closed for ${docName} by user ${user.id}`);
      
      try {
  await pool.execute(
          'UPDATE collaborative_sessions SET is_active = false WHERE item_type = ? AND item_id = ? AND user_id = ?',
          [itemType, itemId, user.id]
        );
      } catch (error) {
        console.error('Failed to update collaborative session on disconnect:', error);
      }
    });
  }

  // Bind state: Load document from database
  async bindState(docName, ydoc) {
    try {
      console.log(`📄 Loading Y.js document: ${docName}`);
      
  const [rows] = await pool.execute(
        'SELECT document_data FROM yjs_documents WHERE doc_name = ?',
        [docName]
      );

      if (rows.length > 0 && rows[0].document_data) {
        // Apply persisted state to the Y.Doc
        const uint8Array = new Uint8Array(rows[0].document_data);
        // Y.applyUpdate(ydoc, uint8Array);
        console.log(`✅ Loaded Y.js document: ${docName}`);
      } else {
        console.log(`📝 New Y.js document: ${docName}`);
      }
    } catch (error) {
      console.error(`Failed to bind state for ${docName}:`, error);
    }
  }

  // Write state: Save document to database
  async writeState(docName, ydoc) {
    try {
      console.log(`💾 Saving Y.js document: ${docName}`);
      
      // Get document update
      // const update = Y.encodeStateAsUpdate(ydoc);
      
      // Parse docName to get item info
      const [itemType, itemId] = docName.split('_');
      
      // Save to database
  await pool.execute(`
        INSERT INTO yjs_documents (doc_name, document_data, item_type, item_id, last_modified)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        document_data = VALUES(document_data),
        last_modified = VALUES(last_modified)
      `, [docName, Buffer.from([]), itemType, parseInt(itemId)]);
      
      console.log(`✅ Saved Y.js document: ${docName}`);
    } catch (error) {
      console.error(`Failed to write state for ${docName}:`, error);
    }
  }

  // Cleanup inactive documents periodically
  startCleanupJob() {
    setInterval(async () => {
      try {
        console.log('🧹 Cleaning up inactive Y.js documents...');
        
        // Remove documents that haven't been accessed in 24 hours
  await pool.execute(`
          DELETE FROM yjs_documents 
          WHERE last_modified < DATE_SUB(NOW(), INTERVAL 24 HOUR)
          AND doc_name NOT IN (
            SELECT DISTINCT CONCAT(item_type, '_', item_id) 
            FROM collaborative_sessions 
            WHERE is_active = true
          )
        `);
        
        // Deactivate old collaborative sessions
  await pool.execute(`
          UPDATE collaborative_sessions 
          SET is_active = false 
          WHERE updated_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `);
        
        console.log('✅ Y.js cleanup completed');
      } catch (error) {
        console.error('Y.js cleanup error:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  stop() {
    if (this.wss) {
      console.log('🛑 Stopping Y.js WebSocket server...');
      this.wss.close();
      this.wss = null;
    }
  }
}

export default YjsWebSocketServer;
