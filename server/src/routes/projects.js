// routes/projects.js
import { Router } from 'express';
const router = Router();
import { getAllProjects, 
  getProject, createProject, updateProject, deleteProject, searchProjectsController,
  getProjectTasks, createProjectTask, getProjectNotes, createProjectNote } from '../controllers/projectController.js';
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
router.put('/:id', validateProject, validateRequest, updateProject);
router.patch('/:id', validateProject, validateRequest, updateProject);
router.delete('/:id', deleteProject);

// Nested task routes under a project
// GET /api/projects/:id/tasks -> list tasks for project
router.get('/:id/tasks', getProjectTasks);
// POST /api/projects/:id/tasks -> create task for project
router.post('/:id/tasks', createProjectTask);

// Nested note routes under a project
// GET /api/projects/:id/notes -> list notes for project
router.get('/:id/notes', getProjectNotes);
// POST /api/projects/:id/notes -> create note for project
router.post('/:id/notes', createProjectNote);

export default router;