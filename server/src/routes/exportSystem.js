import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get export history for a user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, status, format } = req.query;

    let query = `
      SELECT eh.*, u.first_name, u.last_name 
      FROM export_history eh
      LEFT JOIN users u ON eh.user_id = u.id
      WHERE eh.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ` AND eh.status = ?`;
      params.push(status);
    }

    if (format) {
      query += ` AND eh.format = ?`;
      params.push(format);
    }

    query += ` ORDER BY eh.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [exports] = await pool.execute(query, params);
    
    // Parse JSON export_options
    const formattedExports = exports.map(exportItem => ({
      ...exportItem,
      export_options: exportItem.export_options ? JSON.parse(exportItem.export_options) : {}
    }));

    res.json(formattedExports);
  } catch (error) {
    console.error('Error fetching export history:', error);
    res.status(500).json({ error: 'Failed to fetch export history' });
  }
});

// Create a new export request
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      export_type,
      format,
      item_type,
      item_ids = [],
      export_options = {},
      workspace_id
    } = req.body;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      INSERT INTO export_history (
        user_id, export_type, format, item_type, item_count,
        export_options, status, workspace_id
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      userId,
      export_type,
      format,
      item_type,
      item_ids.length,
      JSON.stringify(export_options),
      workspace_id
    ]);

    // Process the export based on format
    const exportId = result.insertId;
    
    try {
      await processExport(exportId, {
        export_type,
        format,
        item_type,
        item_ids,
        export_options,
        workspace_id,
        userId
      });

      // Update status to processing
      await pool.execute(`
        UPDATE export_history 
        SET status = 'processing' 
        WHERE id = ?
      `, [exportId]);

    } catch (error) {
      // Update status to failed
      await pool.execute(`
        UPDATE export_history 
        SET status = 'failed', error_message = ? 
        WHERE id = ?
      `, [error.message, exportId]);
      
      throw error;
    }

    // Fetch the created export
    const [exports] = await pool.execute(`
      SELECT * FROM export_history WHERE id = ?
    `, [exportId]);

    const exportItem = exports[0];
    const formattedExport = {
      ...exportItem,
      export_options: exportItem.export_options ? JSON.parse(exportItem.export_options) : {}
    };

    res.status(201).json(formattedExport);
  } catch (error) {
    console.error('Error creating export:', error);
    res.status(500).json({ error: 'Failed to create export' });
  }
});

// Get export status
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [exports] = await pool.execute(`
      SELECT * FROM export_history 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (exports.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const exportItem = exports[0];
    const formattedExport = {
      ...exportItem,
      export_options: exportItem.export_options ? JSON.parse(exportItem.export_options) : {}
    };

    res.json(formattedExport);
  } catch (error) {
    console.error('Error fetching export status:', error);
    res.status(500).json({ error: 'Failed to fetch export status' });
  }
});

// Download export file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [exports] = await pool.execute(`
      SELECT * FROM export_history 
      WHERE id = ? AND user_id = ? AND status = 'completed'
    `, [id, userId]);

    if (exports.length === 0) {
      return res.status(404).json({ error: 'Export not found or not completed' });
    }

    const exportItem = exports[0];
    
    if (!exportItem.file_path) {
      return res.status(404).json({ error: 'Export file not available' });
    }

    // In a real implementation, you would serve the actual file
    // For now, we'll return the file information
    res.json({
      message: 'File ready for download',
      file_path: exportItem.file_path,
      file_size: exportItem.file_size,
      format: exportItem.format,
      download_url: `/api/exports/${id}/file`
    });
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

// Delete export
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      DELETE FROM export_history 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    res.json({ message: 'Export deleted successfully' });
  } catch (error) {
    console.error('Error deleting export:', error);
    res.status(500).json({ error: 'Failed to delete export' });
  }
});

// Get export statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [stats] = await pool.execute(`
      SELECT 
        format,
        status,
        COUNT(*) as count,
        AVG(file_size) as avg_size,
        MAX(created_at) as last_export
      FROM export_history 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY format, status
      ORDER BY format, status
    `, [userId]);

    const [totalStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_exports,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_exports,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_exports,
        SUM(file_size) as total_size
      FROM export_history 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [userId]);

    res.json({
      summary: totalStats[0],
      breakdown: stats
    });
  } catch (error) {
    console.error('Error fetching export stats:', error);
    res.status(500).json({ error: 'Failed to fetch export stats' });
  }
});

// Process export based on format and type
async function processExport(exportId, exportData) {
  const { format, item_type, item_ids, export_options, userId } = exportData;

  try {
    // Fetch data based on item type
    let data = [];
    
    switch (item_type) {
      case 'tasks':
        data = await fetchTasksForExport(item_ids, userId);
        break;
      case 'projects':
        data = await fetchProjectsForExport(item_ids, userId);
        break;
      case 'reports':
        data = await fetchReportsForExport(export_options, userId);
        break;
      case 'dashboard':
        data = await fetchDashboardForExport(export_options, userId);
        break;
      default:
        throw new Error(`Unsupported item type: ${item_type}`);
    }

    // Generate export content based on format
    let exportContent;
    let fileName;
    let fileSize;

    switch (format) {
      case 'pdf':
        ({ content: exportContent, fileName, fileSize } = await generatePDF(data, export_options));
        break;
      case 'docx':
        ({ content: exportContent, fileName, fileSize } = await generateWord(data, export_options));
        break;
      case 'xlsx':
        ({ content: exportContent, fileName, fileSize } = await generateExcel(data, export_options));
        break;
      case 'csv':
        ({ content: exportContent, fileName, fileSize } = await generateCSV(data, export_options));
        break;
      case 'json':
        ({ content: exportContent, fileName, fileSize } = await generateJSON(data, export_options));
        break;
      case 'png':
        ({ content: exportContent, fileName, fileSize } = await generatePNG(data, export_options));
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // In a real implementation, you would save the file to storage
    const filePath = `/exports/${userId}/${exportId}/${fileName}`;

    // Update export record with completion
    await pool.execute(`
      UPDATE export_history 
      SET status = 'completed', file_path = ?, file_size = ?
      WHERE id = ?
    `, [filePath, fileSize, exportId]);

  } catch (error) {
    console.error('Export processing failed:', error);
    
    await pool.execute(`
      UPDATE export_history 
      SET status = 'failed', error_message = ?
      WHERE id = ?
    `, [error.message, exportId]);
    
    throw error;
  }
}

// Data fetching functions
async function fetchTasksForExport(taskIds, userId) {
  if (taskIds.length === 0) {
    // Fetch all user's tasks
    const [tasks] = await pool.execute(`
      SELECT t.*, p.name as project_name, u.first_name, u.last_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.created_by = ?
      ORDER BY t.created_at DESC
    `, [userId]);
    return tasks;
  } else {
    // Fetch specific tasks
    const placeholders = taskIds.map(() => '?').join(',');
    const [tasks] = await pool.execute(`
      SELECT t.*, p.name as project_name, u.first_name, u.last_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id IN (${placeholders}) AND t.created_by = ?
      ORDER BY t.created_at DESC
    `, [...taskIds, userId]);
    return tasks;
  }
}

async function fetchProjectsForExport(projectIds, userId) {
  if (projectIds.length === 0) {
    const [projects] = await pool.execute(`
      SELECT p.*, u.first_name, u.last_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.created_by = ?
      ORDER BY p.created_at DESC
    `, [userId]);
    return projects;
  } else {
    const placeholders = projectIds.map(() => '?').join(',');
    const [projects] = await pool.execute(`
      SELECT p.*, u.first_name, u.last_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id IN (${placeholders}) AND p.created_by = ?
      ORDER BY p.created_at DESC
    `, [...projectIds, userId]);
    return projects;
  }
}

async function fetchReportsForExport(options, userId) {
  // Implementation for reports export
  return [];
}

async function fetchDashboardForExport(options, userId) {
  // Implementation for dashboard export
  return [];
}

// Export format generators (simplified implementations)
async function generatePDF(data, options) {
  // In a real implementation, you would use a PDF library like puppeteer or jsPDF
  const content = `PDF Export - ${data.length} items`;
  return {
    content,
    fileName: `export_${Date.now()}.pdf`,
    fileSize: content.length
  };
}

async function generateWord(data, options) {
  // In a real implementation, you would use a library like docx
  const content = `Word Export - ${data.length} items`;
  return {
    content,
    fileName: `export_${Date.now()}.docx`,
    fileSize: content.length
  };
}

async function generateExcel(data, options) {
  // In a real implementation, you would use a library like xlsx
  const content = `Excel Export - ${data.length} items`;
  return {
    content,
    fileName: `export_${Date.now()}.xlsx`,
    fileSize: content.length
  };
}

async function generateCSV(data, options) {
  if (data.length === 0) return { content: '', fileName: 'export.csv', fileSize: 0 };
  
  const keys = Object.keys(data[0]);
  let csv = keys.join(',') + '\n';
  
  data.forEach(item => {
    const row = keys.map(key => {
      const value = item[key] || '';
      return typeof value === 'string' && (value.includes(',') || value.includes('"'))
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    });
    csv += row.join(',') + '\n';
  });
  
  return {
    content: csv,
    fileName: `export_${Date.now()}.csv`,
    fileSize: csv.length
  };
}

async function generateJSON(data, options) {
  const content = JSON.stringify(data, null, 2);
  return {
    content,
    fileName: `export_${Date.now()}.json`,
    fileSize: content.length
  };
}

async function generatePNG(data, options) {
  // In a real implementation, you would use a library like puppeteer for screenshots
  const content = `PNG Export - ${data.length} items`;
  return {
    content,
    fileName: `export_${Date.now()}.png`,
    fileSize: content.length
  };
}

export default router;
