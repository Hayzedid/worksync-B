// routes/projects.js
import { Router } from 'express';
const router = Router();
import { getAllProjects, 
  getProject, createProject, updateProject, deleteProject, searchProjectsController } from '../controllers/projectController.js';
import { validateProject } from '../utils/validator.js';
import { validateRequest } from '../middleware/validation.js';
import { createNewTask, getTasksByProject } from '../controllers/taskController.js';
import { create_Note } from '../controllers/noteController.js';
import { getNotesByProject } from '../models/Note.js';

import authenticate from '../middleware/auth.js';

// All routes require JWT authentication
router.use(authenticate);

router.get('/', getAllProjects);
router.get('/search', searchProjectsController);
router.get('/:id', getProject);
router.post('/', validateProject, validateRequest, createProject);
router.put('/:id', updateProject);
router.patch('/:id', updateProject);
router.put('/:id', validateProject, validateRequest, updateProject);
router.patch('/:id', validateProject, validateRequest, updateProject);
router.delete('/:id', deleteProject);

// Nested task routes under a project
// POST /api/projects/:projectId/tasks -> create task for project
router.post('/:projectId/tasks', createNewTask);
// GET /api/projects/:projectId/tasks -> list tasks for project
router.get('/:projectId/tasks', getTasksByProject);

// Nested note routes under a project
// POST /api/projects/:projectId/notes -> create note for project
router.post('/:projectId/notes', (req, res, next) => {
  req.body.project_id = req.params.projectId;
  return create_Note(req, res, next);
});
// GET /api/projects/:projectId/notes -> list notes for project
router.get('/:projectId/notes', async (req, res, next) => {
  try {
    const notes = await getNotesByProject(req.params.projectId, req.user.id);
    return res.json({ success: true, notes });
  } catch (err) {
    next(err);
  }
});

export default router;