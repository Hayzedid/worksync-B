import { query, transaction } from '../config/database.js';
// import { cache } from '../config/redis.js'; // Disabled for production
import { validateUUID, sanitizeInput } from '../utils/validation.js';

/**
 * Time Tracking Controller
 * Handles all time tracking operations for Phase 3
 */

// Get user's time tracking settings
export const getTimeTrackingSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT * FROM time_tracking_settings WHERE user_id = $1',
      [userId]
    );

    let settings;
    if (result.rows.length === 0) {
      // Create default settings
      const defaultSettings = await query(
        `INSERT INTO time_tracking_settings (
          user_id, default_hourly_rate, auto_stop_timer, require_description, 
          default_billable, timezone, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
        [userId, 50.00, true, true, true, 'UTC']
      );
      settings = defaultSettings.rows[0];
    } else {
      settings = result.rows[0];
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get time tracking settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch settings' 
    });
  }
};

// Update time tracking settings
export const updateTimeTrackingSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      default_hourly_rate,
      auto_stop_timer,
      auto_stop_duration,
      require_description,
      default_billable,
      timezone
    } = req.body;

    const result = await query(
      `UPDATE time_tracking_settings 
       SET default_hourly_rate = $1, auto_stop_timer = $2, auto_stop_duration = $3,
           require_description = $4, default_billable = $5, timezone = $6, updated_at = NOW()
       WHERE user_id = $7 RETURNING *`,
      [
        default_hourly_rate,
        auto_stop_timer,
        auto_stop_duration,
        require_description,
        default_billable,
        timezone,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Settings not found' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update time tracking settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update settings' 
    });
  }
};

// Start time tracking
export const startTimer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, task_id, description, is_billable, hourly_rate } = req.body;

    const result = await transaction(async (client) => {
      // Check if user already has an active timer
      const activeResult = await client.query(
        'SELECT * FROM active_timers WHERE user_id = $1',
        [userId]
      );

      if (activeResult.rows.length > 0) {
        throw new Error('You already have an active timer running. Stop it first.');
      }

      // Create time entry
      const timeEntryResult = await client.query(
        `INSERT INTO time_entries (
          user_id, project_id, task_id, description, start_time, 
          is_running, is_billable, hourly_rate, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), true, $5, $6, NOW(), NOW()) RETURNING *`,
        [userId, project_id, task_id, sanitizeInput(description), is_billable, hourly_rate]
      );

      const timeEntry = timeEntryResult.rows[0];

      // Create active timer
      await client.query(
        `INSERT INTO active_timers (user_id, time_entry_id, started_at, last_ping)
         VALUES ($1, $2, NOW(), NOW())`,
        [userId, timeEntry.id]
      );

      // Get project and workspace info
      const projectResult = await client.query(
        'SELECT name, workspace_id FROM projects WHERE id = $1',
        [project_id]
      );

      const projectInfo = projectResult.rows[0];

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          projectInfo.workspace_id,
          userId,
          'time_tracking_started',
          'time_entry',
          timeEntry.id,
          { description, projectName: projectInfo.name }
        ]
      );

      return { ...timeEntry, projectInfo };
    });

    // Cache active timer
    // await cache.set(`active_timer:${userId}`, result, 3600); // Disabled for production

    // Emit real-time event
    req.io?.to(`user:${userId}`).emit('time:timer:started', result);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Timer started successfully'
    });
  } catch (error) {
    console.error('Start timer error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to start timer' 
    });
  }
};

// Stop time tracking
export const stopTimer = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Get active timer
      const activeResult = await client.query(
        `SELECT at.*, te.* FROM active_timers at
         JOIN time_entries te ON at.time_entry_id = te.id
         WHERE at.user_id = $1`,
        [userId]
      );

      if (activeResult.rows.length === 0) {
        throw new Error('No active timer found');
      }

      const activeTimer = activeResult.rows[0];
      const endTime = new Date();
      const duration = Math.floor((endTime - new Date(activeTimer.start_time)) / 1000);

      // Update time entry
      const timeEntryResult = await client.query(
        `UPDATE time_entries 
         SET end_time = $1, duration = $2, is_running = false, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [endTime, duration, activeTimer.time_entry_id]
      );

      const timeEntry = timeEntryResult.rows[0];

      // Delete active timer
      await client.query(
        'DELETE FROM active_timers WHERE user_id = $1',
        [userId]
      );

      // Get project and workspace info
      const projectResult = await client.query(
        'SELECT name, workspace_id FROM projects WHERE id = $1',
        [timeEntry.project_id]
      );

      const projectInfo = projectResult.rows[0];

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          projectInfo.workspace_id,
          userId,
          'time_tracking_stopped',
          'time_entry',
          timeEntry.id,
          { 
            description: timeEntry.description, 
            duration: duration,
            projectName: projectInfo.name 
          }
        ]
      );

      return { ...timeEntry, projectInfo, duration };
    });

    // Clear cache
    // await cache.del(`active_timer:${userId}`); // Disabled for production

    // Emit real-time event
    req.io?.to(`user:${userId}`).emit('time:timer:stopped', result);

    res.json({
      success: true,
      data: result,
      message: 'Timer stopped successfully'
    });
  } catch (error) {
    console.error('Stop timer error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to stop timer' 
    });
  }
};

// Pause timer
export const pauseTimer = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Get active timer
      const activeResult = await client.query(
        `SELECT at.*, te.* FROM active_timers at
         JOIN time_entries te ON at.time_entry_id = te.id
         WHERE at.user_id = $1`,
        [userId]
      );

      if (activeResult.rows.length === 0) {
        throw new Error('No active timer found');
      }

      const activeTimer = activeResult.rows[0];
      const pauseTime = new Date();
      const currentDuration = Math.floor((pauseTime - new Date(activeTimer.start_time)) / 1000);

      // Update time entry - set as paused
      const timeEntryResult = await client.query(
        `UPDATE time_entries 
         SET duration = $1, is_running = false, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [currentDuration, activeTimer.time_entry_id]
      );

      // Keep active timer but mark as paused
      await client.query(
        'UPDATE active_timers SET last_ping = NOW() WHERE user_id = $1',
        [userId]
      );

      return timeEntryResult.rows[0];
    });

    // Update cache
    // await cache.set(`active_timer:${userId}`, { ...result, is_paused: true }, 3600); // Disabled for production

    // Emit real-time event
    req.io?.to(`user:${userId}`).emit('time:timer:paused', result);

    res.json({
      success: true,
      data: result,
      message: 'Timer paused successfully'
    });
  } catch (error) {
    console.error('Pause timer error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to pause timer' 
    });
  }
};

// Resume timer
export const resumeTimer = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Get active timer
      const activeResult = await client.query(
        `SELECT at.*, te.* FROM active_timers at
         JOIN time_entries te ON at.time_entry_id = te.id
         WHERE at.user_id = $1`,
        [userId]
      );

      if (activeResult.rows.length === 0) {
        throw new Error('No paused timer found');
      }

      const activeTimer = activeResult.rows[0];

      // Calculate new start time based on existing duration
      const resumeTime = new Date();
      const adjustedStartTime = new Date(resumeTime.getTime() - (activeTimer.duration * 1000));

      // Update time entry - resume running
      const timeEntryResult = await client.query(
        `UPDATE time_entries 
         SET start_time = $1, is_running = true, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [adjustedStartTime, activeTimer.time_entry_id]
      );

      // Update active timer
      await client.query(
        'UPDATE active_timers SET started_at = $1, last_ping = NOW() WHERE user_id = $2',
        [resumeTime, userId]
      );

      return timeEntryResult.rows[0];
    });

    // Update cache
    // await cache.set(`active_timer:${userId}`, { ...result, is_paused: false }, 3600); // Disabled for production

    // Emit real-time event
    req.io?.to(`user:${userId}`).emit('time:timer:resumed', result);

    res.json({
      success: true,
      data: result,
      message: 'Timer resumed successfully'
    });
  } catch (error) {
    console.error('Resume timer error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to resume timer' 
    });
  }
};

// Get active timer
export const getActiveTimer = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check cache first
    // const cached = await cache.get(`active_timer:${userId}`); // Disabled for production
    // if (cached) {
    //   return res.json({ success: true, data: cached });
    // }

    const result = await query(
      `SELECT at.*, te.*, p.name as project_name
       FROM active_timers at
       JOIN time_entries te ON at.time_entry_id = te.id
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE at.user_id = $1`,
      [userId]
    );

    const activeTimer = result.rows.length > 0 ? result.rows[0] : null;

    if (activeTimer) {
      // Calculate current duration
      const currentTime = new Date();
      const currentDuration = Math.floor((currentTime - new Date(activeTimer.start_time)) / 1000);
      activeTimer.current_duration = currentDuration;

      // Cache for 1 minute
      // await cache.set(`active_timer:${userId}`, activeTimer, 60); // Disabled for production
    }

    res.json({
      success: true,
      data: activeTimer
    });
  } catch (error) {
    console.error('Get active timer error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch active timer' 
    });
  }
};

// Get time entries
export const getTimeEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      project_id, 
      start_date, 
      end_date, 
      page = 1, 
      limit = 20,
      is_billable 
    } = req.query;

    let whereClause = 'WHERE te.user_id = $1';
    const params = [userId];
    let paramCount = 1;

    if (project_id) {
      whereClause += ` AND te.project_id = $${++paramCount}`;
      params.push(project_id);
    }

    if (start_date) {
      whereClause += ` AND te.start_time >= $${++paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND te.start_time <= $${++paramCount}`;
      params.push(end_date);
    }

    if (is_billable !== undefined) {
      whereClause += ` AND te.is_billable = $${++paramCount}`;
      params.push(is_billable === 'true');
    }

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT te.*, p.name as project_name, t.title as task_title
       FROM time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       LEFT JOIN kanban_cards t ON te.task_id = t.id
       ${whereClause}
       ORDER BY te.start_time DESC
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM time_entries te ${whereClause}`,
      params.slice(0, -2)
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch time entries' 
    });
  }
};

// Create manual time entry
export const createTimeEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      project_id,
      task_id,
      description,
      start_time,
      end_time,
      duration,
      is_billable,
      hourly_rate,
      tags
    } = req.body;

    const result = await transaction(async (client) => {
      // Calculate duration if not provided
      let calculatedDuration = duration;
      if (!calculatedDuration && start_time && end_time) {
        calculatedDuration = Math.floor((new Date(end_time) - new Date(start_time)) / 1000);
      }

      // Create time entry
      const timeEntryResult = await client.query(
        `INSERT INTO time_entries (
          user_id, project_id, task_id, description, start_time, end_time,
          duration, is_running, is_billable, hourly_rate, tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9, $10, NOW(), NOW()) RETURNING *`,
        [
          userId,
          project_id,
          task_id,
          sanitizeInput(description),
          start_time,
          end_time,
          calculatedDuration,
          is_billable,
          hourly_rate,
          JSON.stringify(tags || [])
        ]
      );

      const timeEntry = timeEntryResult.rows[0];

      // Get project and workspace info
      const projectResult = await client.query(
        'SELECT name, workspace_id FROM projects WHERE id = $1',
        [project_id]
      );

      const projectInfo = projectResult.rows[0];

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          projectInfo.workspace_id,
          userId,
          'time_entry_created',
          'time_entry',
          timeEntry.id,
          { 
            description, 
            duration: calculatedDuration,
            projectName: projectInfo.name 
          }
        ]
      );

      return { ...timeEntry, projectInfo };
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create time entry' 
    });
  }
};

// Update time entry
export const updateTimeEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.id;
    const {
      description,
      start_time,
      end_time,
      duration,
      is_billable,
      hourly_rate,
      tags
    } = req.body;

    // Calculate duration if not provided
    let calculatedDuration = duration;
    if (!calculatedDuration && start_time && end_time) {
      calculatedDuration = Math.floor((new Date(end_time) - new Date(start_time)) / 1000);
    }

    const result = await query(
      `UPDATE time_entries 
       SET description = $1, start_time = $2, end_time = $3, duration = $4,
           is_billable = $5, hourly_rate = $6, tags = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [
        sanitizeInput(description),
        start_time,
        end_time,
        calculatedDuration,
        is_billable,
        hourly_rate,
        JSON.stringify(tags || []),
        entryId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Time entry not found' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update time entry' 
    });
  }
};

// Delete time entry
export const deleteTimeEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.id;

    const result = await query(
      'DELETE FROM time_entries WHERE id = $1 AND user_id = $2 RETURNING *',
      [entryId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Time entry not found' 
      });
    }

    res.json({
      success: true,
      message: 'Time entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete time entry' 
    });
  }
};

// Get time tracking report
export const getTimeTrackingReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      project_id, 
      start_date, 
      end_date, 
      group_by = 'day' // day, week, month, project
    } = req.query;

    let whereClause = 'WHERE te.user_id = $1 AND te.end_time IS NOT NULL';
    const params = [userId];
    let paramCount = 1;

    if (project_id) {
      whereClause += ` AND te.project_id = $${++paramCount}`;
      params.push(project_id);
    }

    if (start_date) {
      whereClause += ` AND te.start_time >= $${++paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND te.start_time <= $${++paramCount}`;
      params.push(end_date);
    }

    let groupByClause;
    let selectClause;

    switch (group_by) {
      case 'day':
        selectClause = `DATE(te.start_time) as period,
                       SUM(te.duration) as total_seconds,
                       COUNT(*) as entry_count,
                       SUM(CASE WHEN te.is_billable THEN te.duration ELSE 0 END) as billable_seconds,
                       SUM(CASE WHEN te.is_billable THEN te.duration * te.hourly_rate / 3600 ELSE 0 END) as billable_amount`;
        groupByClause = 'GROUP BY DATE(te.start_time) ORDER BY DATE(te.start_time)';
        break;
      case 'project':
        selectClause = `p.name as period,
                       SUM(te.duration) as total_seconds,
                       COUNT(*) as entry_count,
                       SUM(CASE WHEN te.is_billable THEN te.duration ELSE 0 END) as billable_seconds,
                       SUM(CASE WHEN te.is_billable THEN te.duration * te.hourly_rate / 3600 ELSE 0 END) as billable_amount`;
        groupByClause = 'GROUP BY p.id, p.name ORDER BY total_seconds DESC';
        break;
      default:
        selectClause = `DATE(te.start_time) as period,
                       SUM(te.duration) as total_seconds,
                       COUNT(*) as entry_count,
                       SUM(CASE WHEN te.is_billable THEN te.duration ELSE 0 END) as billable_seconds,
                       SUM(CASE WHEN te.is_billable THEN te.duration * te.hourly_rate / 3600 ELSE 0 END) as billable_amount`;
        groupByClause = 'GROUP BY DATE(te.start_time) ORDER BY DATE(te.start_time)';
    }

    const result = await query(
      `SELECT ${selectClause}
       FROM time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       ${whereClause}
       ${groupByClause}`,
      params
    );

    // Get totals
    const totalsResult = await query(
      `SELECT 
         SUM(te.duration) as total_seconds,
         COUNT(*) as total_entries,
         SUM(CASE WHEN te.is_billable THEN te.duration ELSE 0 END) as total_billable_seconds,
         SUM(CASE WHEN te.is_billable THEN te.duration * te.hourly_rate / 3600 ELSE 0 END) as total_billable_amount
       FROM time_entries te
       ${whereClause}`,
      params
    );

    const totals = totalsResult.rows[0];

    res.json({
      success: true,
      data: {
        periods: result.rows,
        totals: {
          total_hours: Math.round((totals.total_seconds || 0) / 36) / 100,
          total_entries: parseInt(totals.total_entries) || 0,
          billable_hours: Math.round((totals.total_billable_seconds || 0) / 36) / 100,
          billable_amount: parseFloat(totals.total_billable_amount) || 0
        }
      }
    });
  } catch (error) {
    console.error('Get time tracking report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate report' 
    });
  }
};
