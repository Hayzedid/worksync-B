// =====================================================
// WorkSync Phase 3 - MySQL Time Tracking Controller
// Professional time tracking with timers and reporting
// Compatible with existing MySQL infrastructure
// =====================================================

import { pool } from '../config/database.js';

// =====================================================
// TIME TRACKING SETTINGS
// =====================================================

/**
 * Get user's time tracking settings
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const [settings] = await pool.execute(`
      SELECT * FROM time_tracking_settings WHERE user_id = ?
    `, [userId]);

    if (settings.length === 0) {
      // Create default settings
      await pool.execute(`
        INSERT INTO time_tracking_settings (user_id) VALUES (?)
      `, [userId]);

      const [newSettings] = await pool.execute(`
        SELECT * FROM time_tracking_settings WHERE user_id = ?
      `, [userId]);

      return res.json({
        success: true,
        settings: newSettings[0]
      });
    }

    res.json({
      success: true,
      settings: settings[0]
    });
  } catch (error) {
    console.error('Error fetching time tracking settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

/**
 * Update user's time tracking settings
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      defaultHourlyRate,
      trackIdleTime,
      idleTimeoutMinutes,
      autoStopTimer,
      dailyGoalHours,
      weeklyGoalHours,
      timezone,
      dateFormat,
      timeFormat
    } = req.body;

    await pool.execute(`
      UPDATE time_tracking_settings 
      SET 
        default_hourly_rate = ?,
        track_idle_time = ?,
        idle_timeout_minutes = ?,
        auto_stop_timer = ?,
        daily_goal_hours = ?,
        weekly_goal_hours = ?,
        timezone = ?,
        date_format = ?,
        time_format = ?,
        updated_at = NOW()
      WHERE user_id = ?
    `, [
      defaultHourlyRate,
      trackIdleTime,
      idleTimeoutMinutes,
      autoStopTimer,
      dailyGoalHours,
      weeklyGoalHours,
      timezone,
      dateFormat,
      timeFormat,
      userId
    ]);

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating time tracking settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

// =====================================================
// ACTIVE TIMERS
// =====================================================

/**
 * Get user's active timer
 */
export const getActiveTimer = async (req, res) => {
  try {
    const userId = req.user.id;

    const [timer] = await pool.execute(`
      SELECT 
        tat.*,
        p.name as project_name,
        t.title as task_title,
        kc.title as card_title
      FROM time_tracking_active_timers tat
      LEFT JOIN projects p ON tat.project_id = p.id
      LEFT JOIN tasks t ON tat.task_id = t.id
      LEFT JOIN kanban_cards kc ON tat.card_id = kc.id
      WHERE tat.user_id = ?
    `, [userId]);

    if (timer.length === 0) {
      return res.json({
        success: true,
        timer: null
      });
    }

    // Calculate current duration
    const startTime = new Date(timer[0].started_at);
    const now = new Date();
    const currentDuration = Math.floor((now - startTime) / 1000) - timer[0].paused_duration;

    res.json({
      success: true,
      timer: {
        ...timer[0],
        current_duration: currentDuration
      }
    });
  } catch (error) {
    console.error('Error fetching active timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active timer',
      error: error.message
    });
  }
};

/**
 * Start a new timer
 */
export const startTimer = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const { projectId, taskId, cardId, description, tags = [] } = req.body;

    // Check if user already has an active timer
    const [existingTimer] = await connection.execute(
      'SELECT id FROM time_tracking_active_timers WHERE user_id = ?',
      [userId]
    );

    if (existingTimer.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Timer already running. Stop current timer first.'
      });
    }

    // Create new active timer
    const [result] = await connection.execute(`
      INSERT INTO time_tracking_active_timers 
      (user_id, project_id, task_id, card_id, description, started_at, tags)
      VALUES (?, ?, ?, ?, ?, NOW(), ?)
    `, [userId, projectId, taskId, cardId, description, JSON.stringify(tags)]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Timer started successfully',
      timer: {
        id: result.insertId,
        userId,
        projectId,
        taskId,
        cardId,
        description,
        startedAt: new Date(),
        isPaused: false
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error starting timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start timer',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Stop active timer and create time entry
 */
export const stopTimer = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const { description, isBillable = false, hourlyRate } = req.body;

    // Get active timer
    const [timer] = await connection.execute(`
      SELECT * FROM time_tracking_active_timers WHERE user_id = ?
    `, [userId]);

    if (timer.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active timer found'
      });
    }

    const activeTimer = timer[0];
    const endTime = new Date();
    const startTime = new Date(activeTimer.started_at);
    const durationSeconds = Math.floor((endTime - startTime) / 1000) - activeTimer.paused_duration;

    // Create time entry
    const [entryResult] = await connection.execute(`
      INSERT INTO time_tracking_entries 
      (user_id, project_id, task_id, card_id, description, start_time, end_time, 
       duration_seconds, is_billable, hourly_rate, tags, entry_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TIMER')
    `, [
      userId,
      activeTimer.project_id,
      activeTimer.task_id,
      activeTimer.card_id,
      description || activeTimer.description,
      activeTimer.started_at,
      endTime,
      durationSeconds,
      isBillable,
      hourlyRate,
      activeTimer.tags
    ]);

    // Delete active timer
    await connection.execute(`
      DELETE FROM time_tracking_active_timers WHERE user_id = ?
    `, [userId]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Timer stopped successfully',
      entry: {
        id: entryResult.insertId,
        duration: durationSeconds,
        durationHours: (durationSeconds / 3600).toFixed(2)
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error stopping timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop timer',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Pause active timer
 */
export const pauseTimer = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.execute(`
      UPDATE time_tracking_active_timers 
      SET is_paused = TRUE, last_activity_at = NOW()
      WHERE user_id = ? AND is_paused = FALSE
    `, [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active timer found or timer already paused'
      });
    }

    res.json({
      success: true,
      message: 'Timer paused successfully'
    });
  } catch (error) {
    console.error('Error pausing timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause timer',
      error: error.message
    });
  }
};

/**
 * Resume paused timer
 */
export const resumeTimer = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current timer to calculate pause duration
    const [timer] = await pool.execute(`
      SELECT * FROM time_tracking_active_timers WHERE user_id = ? AND is_paused = TRUE
    `, [userId]);

    if (timer.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No paused timer found'
      });
    }

    const pauseDuration = Math.floor((new Date() - new Date(timer[0].last_activity_at)) / 1000);
    const newPausedDuration = timer[0].paused_duration + pauseDuration;

    await pool.execute(`
      UPDATE time_tracking_active_timers 
      SET is_paused = FALSE, paused_duration = ?, last_activity_at = NOW()
      WHERE user_id = ?
    `, [newPausedDuration, userId]);

    res.json({
      success: true,
      message: 'Timer resumed successfully'
    });
  } catch (error) {
    console.error('Error resuming timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume timer',
      error: error.message
    });
  }
};

// =====================================================
// TIME ENTRIES
// =====================================================

/**
 * Get user's time entries
 */
export const getTimeEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      startDate, 
      endDate, 
      projectId, 
      page = 1, 
      limit = 50 
    } = req.query;

    let query = `
      SELECT 
        tte.*,
        p.name as project_name,
        t.title as task_title,
        kc.title as card_title
      FROM time_tracking_entries tte
      LEFT JOIN projects p ON tte.project_id = p.id
      LEFT JOIN tasks t ON tte.task_id = t.id
      LEFT JOIN kanban_cards kc ON tte.card_id = kc.id
      WHERE tte.user_id = ?
    `;
    
    const queryParams = [userId];

    // Add filters
    if (startDate) {
      query += ' AND DATE(tte.start_time) >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(tte.start_time) <= ?';
      queryParams.push(endDate);
    }
    
    if (projectId) {
      query += ' AND tte.project_id = ?';
      queryParams.push(projectId);
    }

    query += ' ORDER BY tte.start_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [entries] = await pool.execute(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM time_tracking_entries WHERE user_id = ?';
    const countParams = [userId];
    
    if (startDate) {
      countQuery += ' AND DATE(start_time) >= ?';
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ' AND DATE(start_time) <= ?';
      countParams.push(endDate);
    }
    
    if (projectId) {
      countQuery += ' AND project_id = ?';
      countParams.push(projectId);
    }

    const [countResult] = await pool.execute(countQuery, countParams);

    res.json({
      success: true,
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time entries',
      error: error.message
    });
  }
};

/**
 * Create manual time entry
 */
export const createTimeEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      projectId,
      taskId,
      cardId,
      description,
      startTime,
      endTime,
      durationSeconds,
      isBillable = false,
      hourlyRate,
      tags = []
    } = req.body;

    // Calculate duration if not provided
    let finalDuration = durationSeconds;
    if (!finalDuration && startTime && endTime) {
      finalDuration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
    }

    const [result] = await pool.execute(`
      INSERT INTO time_tracking_entries 
      (user_id, project_id, task_id, card_id, description, start_time, end_time, 
       duration_seconds, is_billable, hourly_rate, tags, entry_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL')
    `, [
      userId, projectId, taskId, cardId, description, startTime, endTime,
      finalDuration, isBillable, hourlyRate, JSON.stringify(tags)
    ]);

    res.status(201).json({
      success: true,
      message: 'Time entry created successfully',
      entry: {
        id: result.insertId,
        duration: finalDuration,
        durationHours: (finalDuration / 3600).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create time entry',
      error: error.message
    });
  }
};

/**
 * Update time entry
 */
export const updateTimeEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'description', 'start_time', 'end_time', 'duration_seconds',
      'is_billable', 'hourly_rate', 'tags'
    ];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        updateFields.push(`${field} = ?`);
        
        if (field === 'tags') {
          updateValues.push(JSON.stringify(updates[field]));
        } else {
          updateValues.push(updates[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(entryId, userId);

    const [result] = await pool.execute(
      `UPDATE time_tracking_entries SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Time entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update time entry',
      error: error.message
    });
  }
};

/**
 * Delete time entry
 */
export const deleteTimeEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      DELETE FROM time_tracking_entries WHERE id = ? AND user_id = ?
    `, [entryId, userId]);

    if (result.affectedRows === 0) {
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
    console.error('Error deleting time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete time entry',
      error: error.message
    });
  }
};

// =====================================================
// REPORTING
// =====================================================

/**
 * Get time tracking reports
 */
export const getTimeReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      startDate, 
      endDate, 
      groupBy = 'date',
      projectId 
    } = req.query;

    let query = '';
    let queryParams = [userId];

    switch (groupBy) {
      case 'date':
        query = `
          SELECT 
            DATE(start_time) as date,
            SUM(duration_seconds) as total_seconds,
            SUM(duration_seconds) / 3600 as total_hours,
            COUNT(*) as entry_count,
            SUM(CASE WHEN is_billable = 1 THEN duration_seconds ELSE 0 END) / 3600 as billable_hours
          FROM time_tracking_entries 
          WHERE user_id = ?
        `;
        break;
        
      case 'project':
        query = `
          SELECT 
            p.name as project_name,
            p.id as project_id,
            SUM(tte.duration_seconds) as total_seconds,
            SUM(tte.duration_seconds) / 3600 as total_hours,
            COUNT(*) as entry_count,
            SUM(CASE WHEN tte.is_billable = 1 THEN tte.duration_seconds ELSE 0 END) / 3600 as billable_hours
          FROM time_tracking_entries tte
          LEFT JOIN projects p ON tte.project_id = p.id
          WHERE tte.user_id = ?
        `;
        break;
        
      case 'week':
        query = `
          SELECT 
            YEARWEEK(start_time) as week,
            SUM(duration_seconds) as total_seconds,
            SUM(duration_seconds) / 3600 as total_hours,
            COUNT(*) as entry_count,
            SUM(CASE WHEN is_billable = 1 THEN duration_seconds ELSE 0 END) / 3600 as billable_hours
          FROM time_tracking_entries 
          WHERE user_id = ?
        `;
        break;
    }

    // Add date filters
    if (startDate) {
      query += ' AND DATE(start_time) >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(start_time) <= ?';
      queryParams.push(endDate);
    }
    
    if (projectId) {
      query += ' AND project_id = ?';
      queryParams.push(projectId);
    }

    query += ` GROUP BY ${groupBy === 'project' ? 'project_id' : groupBy === 'week' ? 'week' : 'date'}`;
    query += ' ORDER BY ' + (groupBy === 'project' ? 'total_hours DESC' : groupBy + ' DESC');

    const [report] = await pool.execute(query, queryParams);

    res.json({
      success: true,
      report,
      groupBy
    });
  } catch (error) {
    console.error('Error generating time report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

export default {
  getSettings,
  updateSettings,
  getActiveTimer,
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeReport
};
