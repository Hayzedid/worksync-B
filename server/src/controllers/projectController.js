// Update project by ID
import { getProjectsService, getProjectService, updateProjectService, deleteProjectService } from '../services/projectService.js';
import { normalizeStatus } from '../utils/status.js';
export const updateProject = async (req, res, next) => {
  try {
    const updateData = {
      id: req.params.id,
      userId: req.user.id,
      ...req.body
    };
    // ...existing update logic here...
  } catch (err) {
    next(err);
  }
};
import { getTasksByProjectForUser } from '../models/Task.js';
import { getNotesByProject } from '../models/Note.js';

export const getAllProjects = async (req, res, next) => {
  try {
    const wsParam = req.query.workspace_id ?? req.query.ws;
    const workspaceId = wsParam ? parseInt(wsParam, 10) : undefined;
    const projectsRaw = await getProjectsService(req.user.id, Number.isFinite(workspaceId) ? workspaceId : undefined);
    const projects = projectsRaw.map(p => ({
      ...p,
      workspaceId: p.workspace_id ?? p.workspaceId ?? null,
      workspace: (p.workspace_join_id ? { id: p.workspace_join_id, name: p.workspace_name } : undefined)
    }));
    res.json({ success: true, projects });
  } catch (err) {
    next(err);
  }
};

// Helper: resolve workspace id from request context (query, headers, referer, body)
const resolveWorkspaceId = (req) => {
  // 1) Query
  const q = req.query?.workspace_id ?? req.query?.ws;
  if (q !== undefined && q !== null && q !== '') {
    const n = parseInt(q, 10);
    if (Number.isFinite(n)) return n;
  }
  // 2) Header
  const h = req.headers?.['x-workspace-id'];
  if (h !== undefined && h !== null && h !== '') {
    const n = parseInt(h, 10);
    if (Number.isFinite(n)) return n;
  }
  // 3) Referer URL (?ws=ID)
  const ref = req.headers?.referer || req.headers?.referrer;
  if (ref) {
    try {
      const u = new URL(ref);
      const ws = u.searchParams.get('ws') || u.searchParams.get('workspace_id');
      if (ws) {
        const n = parseInt(ws, 10);
        if (Number.isFinite(n)) return n;
      }
    } catch (_) { /* ignore parse errors */ }
  }
  // 4) Body (last resort)
  const b = req.body?.workspace_id ?? req.body?.workspaceId;
  if (b !== undefined && b !== null && b !== '') {
    const n = parseInt(b, 10);
    if (Number.isFinite(n)) return n;
  }
  return null; // no workspace context
};

export const getProject = async (req, res, next) => {
  try {
    const project = await getProjectService(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

export const createProject = async (req, res, next) => {
  try {
    // Resolve workspace context from various sources (query, headers, referer, body)
    const contextWorkspaceId = resolveWorkspaceId(req);
    
    // Ensure all required fields are present and set to null if undefined
    const { name, description, status, workspace_id } = req.body;
    const finalWorkspaceId = workspace_id ?? contextWorkspaceId;
    
    const projectData = {
      userId: req.user.id,
      name: name ?? null,
      description: description ?? '',
      status: normalizeStatus(status),
      // Use explicit workspace_id from body if provided, otherwise use resolved context
      workspace_id: finalWorkspaceId
    };
  // Dynamic import to avoid potential circular dependency issues at module-evaluation time
  const { createProjectService, getProjectService: getProjectServiceFromService } = await import('../services/projectService.js');
  const projectId = await createProjectService(projectData);
  // Fetch the full created project to return complete object for optimistic updates
  const created = await getProjectServiceFromService(projectId, req.user.id);
  return res.status(201).json({ success: true, message: 'Project created', project: created });
  } catch (err) {
    console.error('Error creating project:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    // Enhanced debug logging for raw values
    const projectIdRaw = req.params.id;
    const userIdRaw = req.user && req.user.id;

    // Parse and validate
    const projectId = projectIdRaw !== undefined ? Number(projectIdRaw) : null;
    const userId = userIdRaw !== undefined ? Number(userIdRaw) : null;

    if (
      projectId === null || isNaN(projectId) ||
      userId === null || isNaN(userId)
    ) {
      console.error('[deleteProject] Invalid projectId or userId', { projectId, userId });
      return res.status(400).json({ success: false, message: 'Invalid project or user ID' });
    }
    const affectedRows = await deleteProjectService(projectId, userId);
    if (!affectedRows) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

export async function searchProjectsController(req, res, next) {
  try {
    const { q, status, workspace_id } = req.query;
    const userId = req.user.id;
    
    // Parse workspace_id
    let workspaceId = workspace_id;
    if (workspace_id && workspace_id !== 'all') {
      workspaceId = parseInt(workspace_id, 10);
      if (!Number.isFinite(workspaceId)) {
        workspaceId = undefined;
      }
    } else {
      workspaceId = undefined;
    }
    
    // Normalize status
    let normalizedStatus = status;
    if (status && status !== 'all') {
      const synonyms = { 
        on_hold: 'archived', 
        planned: 'planning',
        in_progress: 'active'
      };
      normalizedStatus = String(status).toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      normalizedStatus = synonyms[normalizedStatus] || normalizedStatus;
    }
    
    // Perform search
    const projects = await searchProjects({ 
      userId, 
      q, 
      status: normalizedStatus, 
      workspaceId 
    });
    
    res.json({ 
      success: true, 
      projects,
      count: projects.length,
      query: { q, status: normalizedStatus, workspace_id: workspaceId }
    });
  } catch (error) {
    console.error('Error in searchProjectsController:', error);
    next(error);
  }
}

// Get tasks for a specific project
export async function getProjectTasks(req, res, next) {
  try {
    const { id } = req.params;
    const tasks = await getTasksByProjectForUser(id, req.user.id);
    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
}

// Create task in a specific project
export async function createProjectTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, status = 'todo' } = req.body;
    
    // Get the project details to inherit workspace_id
    const project = await getProjectService(id, req.user.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Import the task service/model
    const { createTaskService } = await import('../services/taskService.js');
    
    const taskData = {
      title,
      status,
      project_id: parseInt(id),
      created_by: req.user.id,
      // Inherit workspace_id from parent project
      workspace_id: project.workspace_id || project.workspace_join_id || null
    };
    
    const taskId = await createTaskService(taskData);
    res.status(201).json({ success: true, taskId, message: 'Task created in project' });
  } catch (error) {
    next(error);
  }
}

// Get notes for a specific project
export async function getProjectNotes(req, res, next) {
  try {
    const { id } = req.params;
    const notes = await getNotesByProject(id, req.user.id);
    res.json({ success: true, notes });
  } catch (error) {
    next(error);
  }
}

// Create note in a specific project
// Create note in a specific project
export async function createProjectNote(req, res, next) {
  try {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    
    // Get the project details to inherit workspace_id
    const project = await getProjectService(id, req.user.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Import the note service/model
    const { createNoteService } = await import('../services/noteService.js');
    
    const noteData = {
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      project_id: parseInt(id),
      created_by: req.user.id,
      // Inherit workspace_id from parent project
      workspace_id: project.workspace_id || project.workspace_join_id || null
    };
    
    const noteId = await createNoteService(noteData);
    res.status(201).json({ success: true, noteId, message: 'Note created in project' });
  } catch (error) {
    next(error);
  }
}
