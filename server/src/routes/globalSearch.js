import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Global search endpoint
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      q: query, 
      type, 
      status, 
      priority, 
      assignee, 
      project, 
      workspace, 
      tag, 
      due, 
      created, 
      updated, 
      is: specialFilter,
      limit = 50 
    } = req.query;

    if (!query && !type && !status && !priority) {
      return res.json([]);
    }

    const results = [];
    const searchParams = {
      query: query || '',
      type,
      status,
      priority,
      assignee,
      project,
      workspace,
      tag,
      due,
      created,
      updated,
      specialFilter,
      userId,
      limit: parseInt(limit)
    };

    // Search tasks
    if (!type || type === 'task') {
      const taskResults = await searchTasks(searchParams);
      results.push(...taskResults);
    }

    // Search projects
    if (!type || type === 'project') {
      const projectResults = await searchProjects(searchParams);
      results.push(...projectResults);
    }

    // Search workspaces
    if (!type || type === 'workspace') {
      const workspaceResults = await searchWorkspaces(searchParams);
      results.push(...workspaceResults);
    }

    // Search notes
    if (!type || type === 'note') {
      const noteResults = await searchNotes(searchParams);
      results.push(...noteResults);
    }

    // Search users
    if (!type || type === 'user') {
      const userResults = await searchUsers(searchParams);
      results.push(...userResults);
    }

    // Sort by relevance score and limit results
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, searchParams.limit);

    // Save search history
    if (query) {
      await saveSearchHistory(userId, query, req.query, sortedResults.length);
    }

    res.json(sortedResults);
  } catch (error) {
    console.error('Error performing global search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// Search tasks
async function searchTasks(params) {
  const { query, status, priority, assignee, project, workspace, due, userId } = params;
  
  let sql = `
    SELECT 
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.due_date,
      t.created_at,
      p.name as project_name,
      w.name as workspace_name,
      u.first_name,
      u.last_name,
      MATCH(t.title, t.description) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance_score
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN workspaces w ON t.workspace_id = w.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE (t.created_by = ? OR t.assigned_to = ?)
  `;
  
  const sqlParams = [query || '', userId, userId];
  
  if (query) {
    sql += ` AND (
      t.title LIKE ? OR 
      t.description LIKE ? OR
      MATCH(t.title, t.description) AGAINST (? IN NATURAL LANGUAGE MODE)
    )`;
    const searchTerm = `%${query}%`;
    sqlParams.push(searchTerm, searchTerm, query);
  }
  
  if (status) {
    sql += ` AND t.status = ?`;
    sqlParams.push(status);
  }
  
  if (priority) {
    sql += ` AND t.priority = ?`;
    sqlParams.push(priority);
  }
  
  if (assignee) {
    sql += ` AND (u.first_name LIKE ? OR u.last_name LIKE ?)`;
    sqlParams.push(`%${assignee}%`, `%${assignee}%`);
  }
  
  if (project) {
    sql += ` AND p.name LIKE ?`;
    sqlParams.push(`%${project}%`);
  }
  
  if (workspace) {
    sql += ` AND w.name LIKE ?`;
    sqlParams.push(`%${workspace}%`);
  }
  
  if (due) {
    switch (due) {
      case 'today':
        sql += ` AND DATE(t.due_date) = CURDATE()`;
        break;
      case 'tomorrow':
        sql += ` AND DATE(t.due_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`;
        break;
      case 'overdue':
        sql += ` AND t.due_date < CURDATE() AND t.status != 'done'`;
        break;
      case 'this-week':
        sql += ` AND YEARWEEK(t.due_date) = YEARWEEK(CURDATE())`;
        break;
    }
  }
  
  sql += ` ORDER BY relevance_score DESC, t.updated_at DESC LIMIT 20`;
  
  try {
    const [tasks] = await pool.execute(sql, sqlParams);
    
    return tasks.map(task => ({
      id: task.id.toString(),
      type: 'task',
      title: task.title,
      description: task.description,
      subtitle: task.project_name || 'No Project',
      url: `/tasks/${task.id}`,
      metadata: {
        status: task.status,
        priority: task.priority,
        assignee: task.first_name && task.last_name ? `${task.first_name} ${task.last_name}` : null,
        dueDate: task.due_date,
        project: task.project_name,
        workspace: task.workspace_name
      },
      score: calculateRelevanceScore(query, task.title, task.description, task.relevance_score),
      matchedFields: getMatchedFields(query, task)
    }));
  } catch (error) {
    console.error('Error searching tasks:', error);
    return [];
  }
}

// Search projects
async function searchProjects(params) {
  const { query, workspace, userId } = params;
  
  let sql = `
    SELECT 
      p.id,
      p.name,
      p.description,
      p.created_at,
      p.is_archived,
      w.name as workspace_name,
      u.first_name,
      u.last_name,
      MATCH(p.name, p.description) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance_score
    FROM projects p
    LEFT JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.created_by = ?
  `;
  
  const sqlParams = [query || '', userId];
  
  if (query) {
    sql += ` AND (
      p.name LIKE ? OR 
      p.description LIKE ? OR
      MATCH(p.name, p.description) AGAINST (? IN NATURAL LANGUAGE MODE)
    )`;
    const searchTerm = `%${query}%`;
    sqlParams.push(searchTerm, searchTerm, query);
  }
  
  if (workspace) {
    sql += ` AND w.name LIKE ?`;
    sqlParams.push(`%${workspace}%`);
  }
  
  sql += ` ORDER BY relevance_score DESC, p.updated_at DESC LIMIT 20`;
  
  try {
    const [projects] = await pool.execute(sql, sqlParams);
    
    return projects.map(project => ({
      id: project.id.toString(),
      type: 'project',
      title: project.name,
      description: project.description,
      subtitle: project.workspace_name || 'No Workspace',
      url: `/projects/${project.id}`,
      metadata: {
        workspace: project.workspace_name,
        archived: project.is_archived
      },
      score: calculateRelevanceScore(query, project.name, project.description, project.relevance_score),
      matchedFields: getMatchedFields(query, project)
    }));
  } catch (error) {
    console.error('Error searching projects:', error);
    return [];
  }
}

// Search workspaces
async function searchWorkspaces(params) {
  const { query, userId } = params;
  
  let sql = `
    SELECT 
      w.id,
      w.name,
      w.description,
      w.created_at,
      u.first_name,
      u.last_name,
      MATCH(w.name, w.description) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance_score
    FROM workspaces w
    LEFT JOIN users u ON w.created_by = u.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE (w.created_by = ? OR wm.user_id = ?)
  `;
  
  const sqlParams = [query || '', userId, userId];
  
  if (query) {
    sql += ` AND (
      w.name LIKE ? OR 
      w.description LIKE ? OR
      MATCH(w.name, w.description) AGAINST (? IN NATURAL LANGUAGE MODE)
    )`;
    const searchTerm = `%${query}%`;
    sqlParams.push(searchTerm, searchTerm, query);
  }
  
  sql += ` GROUP BY w.id ORDER BY relevance_score DESC, w.updated_at DESC LIMIT 20`;
  
  try {
    const [workspaces] = await pool.execute(sql, sqlParams);
    
    return workspaces.map(workspace => ({
      id: workspace.id.toString(),
      type: 'workspace',
      title: workspace.name,
      description: workspace.description,
      subtitle: 'Workspace',
      url: `/workspace/${workspace.id}`,
      metadata: {
        createdBy: workspace.first_name && workspace.last_name ? `${workspace.first_name} ${workspace.last_name}` : null
      },
      score: calculateRelevanceScore(query, workspace.name, workspace.description, workspace.relevance_score),
      matchedFields: getMatchedFields(query, workspace)
    }));
  } catch (error) {
    console.error('Error searching workspaces:', error);
    return [];
  }
}

// Search notes
async function searchNotes(params) {
  const { query, project, workspace, userId } = params;
  
  let sql = `
    SELECT 
      n.id,
      n.title,
      n.content,
      n.created_at,
      p.name as project_name,
      w.name as workspace_name,
      u.first_name,
      u.last_name,
      MATCH(n.title, n.content) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance_score
    FROM notes n
    LEFT JOIN projects p ON n.project_id = p.id
    LEFT JOIN workspaces w ON n.workspace_id = w.id
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.created_by = ?
  `;
  
  const sqlParams = [query || '', userId];
  
  if (query) {
    sql += ` AND (
      n.title LIKE ? OR 
      n.content LIKE ? OR
      MATCH(n.title, n.content) AGAINST (? IN NATURAL LANGUAGE MODE)
    )`;
    const searchTerm = `%${query}%`;
    sqlParams.push(searchTerm, searchTerm, query);
  }
  
  if (project) {
    sql += ` AND p.name LIKE ?`;
    sqlParams.push(`%${project}%`);
  }
  
  if (workspace) {
    sql += ` AND w.name LIKE ?`;
    sqlParams.push(`%${workspace}%`);
  }
  
  sql += ` ORDER BY relevance_score DESC, n.updated_at DESC LIMIT 20`;
  
  try {
    const [notes] = await pool.execute(sql, sqlParams);
    
    return notes.map(note => ({
      id: note.id.toString(),
      type: 'note',
      title: note.title,
      description: note.content ? note.content.substring(0, 200) + '...' : '',
      subtitle: note.project_name || note.workspace_name || 'Personal Note',
      url: `/notes/${note.id}`,
      metadata: {
        project: note.project_name,
        workspace: note.workspace_name
      },
      score: calculateRelevanceScore(query, note.title, note.content, note.relevance_score),
      matchedFields: getMatchedFields(query, note)
    }));
  } catch (error) {
    console.error('Error searching notes:', error);
    return [];
  }
}

// Search users
async function searchUsers(params) {
  const { query, userId } = params;
  
  if (!query) return [];
  
  let sql = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.username,
      u.profile_picture,
      u.created_at
    FROM users u
    WHERE u.id != ? AND (
      u.first_name LIKE ? OR 
      u.last_name LIKE ? OR
      u.email LIKE ? OR
      u.username LIKE ?
    )
  `;
  
  const searchTerm = `%${query}%`;
  const sqlParams = [userId, searchTerm, searchTerm, searchTerm, searchTerm];
  
  sql += ` ORDER BY u.first_name, u.last_name LIMIT 10`;
  
  try {
    const [users] = await pool.execute(sql, sqlParams);
    
    return users.map(user => ({
      id: user.id.toString(),
      type: 'user',
      title: `${user.first_name} ${user.last_name}`,
      description: user.email,
      subtitle: user.username || 'User',
      url: `/users/${user.id}`,
      metadata: {
        email: user.email,
        username: user.username,
        profilePicture: user.profile_picture
      },
      score: calculateUserRelevanceScore(query, user),
      matchedFields: getUserMatchedFields(query, user)
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

// Calculate relevance score
function calculateRelevanceScore(query, title, description, mysqlScore = 0) {
  if (!query) return 0;
  
  let score = mysqlScore || 0;
  const queryLower = query.toLowerCase();
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  // Exact title match gets highest score
  if (titleLower === queryLower) score += 100;
  else if (titleLower.includes(queryLower)) score += 50;
  
  // Description matches get lower score
  if (descLower.includes(queryLower)) score += 25;
  
  // Word boundary matches get bonus
  const wordBoundaryRegex = new RegExp(`\\b${queryLower}\\b`, 'i');
  if (wordBoundaryRegex.test(title)) score += 30;
  if (wordBoundaryRegex.test(description)) score += 15;
  
  return score;
}

// Calculate user relevance score
function calculateUserRelevanceScore(query, user) {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
  const email = (user.email || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  
  if (fullName.includes(queryLower)) score += 50;
  if (email.includes(queryLower)) score += 30;
  if (username.includes(queryLower)) score += 40;
  
  return score;
}

// Get matched fields for highlighting
function getMatchedFields(query, item) {
  if (!query) return [];
  
  const fields = [];
  const queryLower = query.toLowerCase();
  
  if (item.title && item.title.toLowerCase().includes(queryLower)) {
    fields.push('title');
  }
  if (item.description && item.description.toLowerCase().includes(queryLower)) {
    fields.push('description');
  }
  if (item.name && item.name.toLowerCase().includes(queryLower)) {
    fields.push('name');
  }
  if (item.content && item.content.toLowerCase().includes(queryLower)) {
    fields.push('content');
  }
  
  return fields;
}

// Get matched fields for users
function getUserMatchedFields(query, user) {
  if (!query) return [];
  
  const fields = [];
  const queryLower = query.toLowerCase();
  
  const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
  if (fullName.includes(queryLower)) fields.push('name');
  if (user.email && user.email.toLowerCase().includes(queryLower)) fields.push('email');
  if (user.username && user.username.toLowerCase().includes(queryLower)) fields.push('username');
  
  return fields;
}

// Save search history
async function saveSearchHistory(userId, query, filters, resultCount) {
  try {
    await pool.execute(`
      INSERT INTO search_history (user_id, query, filters, result_count)
      VALUES (?, ?, ?, ?)
    `, [userId, query, JSON.stringify(filters), resultCount]);
    
    // Clean up old search history (keep only last 100 searches per user)
    await pool.execute(`
      DELETE FROM search_history 
      WHERE user_id = ? AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM search_history 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 100
        ) as recent_searches
      )
    `, [userId, userId]);
  } catch (error) {
    console.error('Error saving search history:', error);
  }
}

// Get search suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }
    
    const suggestions = [];
    
    // Get recent searches
    const [recentSearches] = await pool.execute(`
      SELECT DISTINCT query 
      FROM search_history 
      WHERE user_id = ? AND query LIKE ?
      ORDER BY created_at DESC 
      LIMIT 5
    `, [userId, `%${query}%`]);
    
    suggestions.push(...recentSearches.map(s => ({
      type: 'recent',
      text: s.query,
      icon: 'clock'
    })));
    
    // Get task titles
    const [taskSuggestions] = await pool.execute(`
      SELECT DISTINCT title 
      FROM tasks 
      WHERE (created_by = ? OR assigned_to = ?) AND title LIKE ?
      ORDER BY updated_at DESC 
      LIMIT 3
    `, [userId, userId, `%${query}%`]);
    
    suggestions.push(...taskSuggestions.map(t => ({
      type: 'task',
      text: t.title,
      icon: 'file-text'
    })));
    
    // Get project names
    const [projectSuggestions] = await pool.execute(`
      SELECT DISTINCT name 
      FROM projects 
      WHERE created_by = ? AND name LIKE ?
      ORDER BY updated_at DESC 
      LIMIT 3
    `, [userId, `%${query}%`]);
    
    suggestions.push(...projectSuggestions.map(p => ({
      type: 'project',
      text: p.name,
      icon: 'folder'
    })));
    
    res.json(suggestions.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({ error: 'Failed to get search suggestions' });
  }
});

// Get search history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;
    
    const [history] = await pool.execute(`
      SELECT query, result_count, created_at
      FROM search_history 
      WHERE user_id = ?
      ORDER BY created_at DESC 
      LIMIT ?
    `, [userId, parseInt(limit)]);
    
    res.json(history);
  } catch (error) {
    console.error('Error getting search history:', error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

export default router;
