import { searchTasks } from '../models/Task.js';
import { searchProjects } from '../models/Project.js';
import { searchNotes } from '../models/Note.js';

// Global search cache
const globalSearchCache = new Map();

function getCachedGlobalSearch(cacheKey) {
  return globalSearchCache.get(cacheKey);
}

function setCachedGlobalSearch(cacheKey, results) {
  globalSearchCache.set(cacheKey, results);
  // Auto-expire cache after 5 minutes
  setTimeout(() => {
    globalSearchCache.delete(cacheKey);
  }, 5 * 60 * 1000);
}

export async function globalSearchController(req, res, next) {
  try {
    const { q, type, workspace_id } = req.query;
    const userId = req.user.id;
    
    // Validate search query
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        results: {
          tasks: [],
          projects: [],
          notes: []
        },
        count: {
          tasks: 0,
          projects: 0,
          notes: 0,
          total: 0
        },
        query: { q, type, workspace_id }
      });
    }
    
    // Parse workspace_id
    let parsedWorkspaceId = workspace_id;
    if (workspace_id && workspace_id !== 'all') {
      parsedWorkspaceId = parseInt(workspace_id, 10);
      if (!Number.isFinite(parsedWorkspaceId)) {
        parsedWorkspaceId = undefined;
      }
    } else {
      parsedWorkspaceId = undefined;
    }
    
    // Create cache key
    const cacheKey = `global:${userId}:${q.trim()}:${type || 'all'}:${parsedWorkspaceId || 'all'}`;
    
    // Check cache first
    const cached = getCachedGlobalSearch(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        cached: true
      });
    }
    
    // Determine what to search based on type parameter
    const searchTypes = type ? [type] : ['tasks', 'projects', 'notes'];
    const results = {};
    const searchPromises = [];
    
    // Search tasks
    if (searchTypes.includes('tasks')) {
      searchPromises.push(
        searchTasks({ 
          userId, 
          q, 
          workspace_id: parsedWorkspaceId 
        }).then(tasks => ({ type: 'tasks', data: tasks }))
      );
    }
    
    // Search projects
    if (searchTypes.includes('projects')) {
      searchPromises.push(
        searchProjects({ 
          userId, 
          q, 
          workspaceId: parsedWorkspaceId 
        }).then(projects => ({ type: 'projects', data: projects }))
      );
    }
    
    // Search notes
    if (searchTypes.includes('notes')) {
      searchPromises.push(
        searchNotes({ 
          userId, 
          q, 
          workspace_id: parsedWorkspaceId 
        }).then(notes => ({ type: 'notes', data: notes }))
      );
    }
    
    // Execute all searches in parallel
    const searchResults = await Promise.all(searchPromises);
    
    // Organize results
    searchResults.forEach(({ type, data }) => {
      results[type] = data || [];
    });
    
    // Ensure all result types exist
    results.tasks = results.tasks || [];
    results.projects = results.projects || [];
    results.notes = results.notes || [];
    
    // Calculate counts
    const count = {
      tasks: results.tasks.length,
      projects: results.projects.length,
      notes: results.notes.length,
      total: results.tasks.length + results.projects.length + results.notes.length
    };
    
    // Prepare response
    const response = {
      success: true,
      results,
      count,
      query: { q: q.trim(), type, workspace_id: parsedWorkspaceId },
      cached: false
    };
    
    // Cache the results
    setCachedGlobalSearch(cacheKey, response);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error in globalSearchController:', error);
    next(error);
  }
}

// Combined search with pagination and sorting
export async function advancedSearchController(req, res, next) {
  try {
    const { 
      q, 
      type = 'all', 
      workspace_id, 
      sort_by = 'relevance',
      order = 'desc',
      limit = 20,
      offset = 0
    } = req.query;
    
    const userId = req.user.id;
    
    // Validate and parse parameters
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);
    
    // Parse workspace_id
    let parsedWorkspaceId = workspace_id;
    if (workspace_id && workspace_id !== 'all') {
      parsedWorkspaceId = parseInt(workspace_id, 10);
      if (!Number.isFinite(parsedWorkspaceId)) {
        parsedWorkspaceId = undefined;
      }
    } else {
      parsedWorkspaceId = undefined;
    }

    // Execute searches directly instead of calling globalSearchController
    const searchTypes = type === 'all' ? ['tasks', 'projects', 'notes'] : [type];
    const results = {};
    const searchPromises = [];
    
    // Search tasks
    if (searchTypes.includes('tasks')) {
      searchPromises.push(
        searchTasks({ 
          userId, 
          q, 
          workspace_id: parsedWorkspaceId 
        }).then(tasks => ({ type: 'tasks', data: tasks }))
      );
    }
    
    // Search projects
    if (searchTypes.includes('projects')) {
      searchPromises.push(
        searchProjects({ 
          userId, 
          q, 
          workspaceId: parsedWorkspaceId 
        }).then(projects => ({ type: 'projects', data: projects }))
      );
    }
    
    // Search notes
    if (searchTypes.includes('notes')) {
      searchPromises.push(
        searchNotes({ 
          userId, 
          q, 
          workspace_id: parsedWorkspaceId 
        }).then(notes => ({ type: 'notes', data: notes }))
      );
    }
    
    // Execute all searches in parallel
    const searchResults = await Promise.all(searchPromises);
    
    // Organize results
    searchResults.forEach(({ type, data }) => {
      results[type] = data || [];
    });
    
    // Combine all results with type information
    let allResults = [];
    
    if (results.tasks) {
      allResults = allResults.concat(
        results.tasks.map(item => ({ ...item, result_type: 'task' }))
      );
    }
    if (results.projects) {
      allResults = allResults.concat(
        results.projects.map(item => ({ ...item, result_type: 'project' }))
      );
    }
    if (results.notes) {
      allResults = allResults.concat(
        results.notes.map(item => ({ ...item, result_type: 'note' }))
      );
    }
    
    // Sort results
    if (sort_by === 'date') {
      allResults.sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at);
        const dateB = new Date(b.created_at || b.updated_at);
        return order === 'desc' ? dateB - dateA : dateA - dateB;
      });
    } else {
      // Default relevance sort (by created_at desc for now)
      allResults.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });
    }
    
    // Apply pagination
    const paginatedResults = allResults.slice(parsedOffset, parsedOffset + parsedLimit);
    
    res.json({
      success: true,
      results: paginatedResults,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total: allResults.length,
        has_more: parsedOffset + parsedLimit < allResults.length
      },
      query: { q, type, workspace_id, sort_by, order }
    });
    
  } catch (error) {
    console.error('Error in advancedSearchController:', error);
    next(error);
  }
}