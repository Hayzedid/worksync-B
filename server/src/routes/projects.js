// routes/projects.js
import { Router } from 'express';
const router = Router();
import { getAllProjects, 
    getProject, createProject, updateProject, deleteProject, searchProjectsController } from '../controllers/projectController.js';
import authenticate from '../middleware/auth.js';

// All routes require JWT authentication
router.use(authenticate);

router.get('/', getAllProjects);
router.get('/search', searchProjectsController);
router.get('/:id', getProject);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;