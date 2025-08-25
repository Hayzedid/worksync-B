// controllers/projectController.js
import {
  getProjectsService,
  getProjectService,
  createProjectService,
  updateProjectService,
  deleteProjectService
} from '../services/projectService.js';
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
    const projectId = await createProjectService({ ...req.body, owner_id: req.user.id });
  return res.status(201).json({ success: true, message: 'Project created', projectId });
  } catch (err) {
  return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const affectedRows = await updateProjectService(req.params.id, req.body);
    if (!affectedRows) return res.status(404).json({ success: false, message: 'Project not found' });
  return res.json({ success: true, message: 'Project updated' });
  } catch (err) {
  return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const affectedRows = await deleteProjectService(req.params.id);
    if (!affectedRows) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

export async function searchProjectsController(req, res, next) {
  try {
    const { q } = req.query;
    let { status } = req.query;
    const wsParam = req.query.workspace_id ?? req.query.ws;
    const workspaceId = wsParam ? parseInt(wsParam, 10) : undefined;
    if (status) {
      const synonyms = { on_hold: 'archived', planned: 'planning' };
      status = String(status).toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      status = synonyms[status] || status;
    }
    const userId = req.user.id;
    const projects = await searchProjects({ userId, q, status, workspaceId: Number.isFinite(workspaceId) ? workspaceId : undefined });
    res.json({ success: true, projects });
  } catch (error) {
    next(error);
  }
}
