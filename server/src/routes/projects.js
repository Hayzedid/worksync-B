// routes/projects.js
import { Router } from 'express';
const router = Router();
import { getAllProjects, 
    getProjectById, createProject, updateProject, deleteProject } from '../controllers/projectController.js';
import authenticate from '../middleware/auth.js';

// All routes require JWT authentication
router.use(authenticate);

router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;