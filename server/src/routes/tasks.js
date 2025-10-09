import express from 'express';
import {
    getTasks,
    getSingleTask,
    createNewTask,
    updateTaskById,
    deleteTaskById,
    fetchAssignedTasks,
    searchTasksController,
    addTaskDependencyController,
    removeTaskDependencyController,
    getTaskDependenciesController,
    addReactionController,
    removeReactionController,
    getReactionsController,
    listViewController,
    calendarViewController,
    getTaskStatusOptions
} from '../controllers/taskController.js';
import { validateTask, validateTaskUpdate } from '../utils/validator.js';
import { validateRequest } from '../middleware/validation.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getTasks);
router.get('/status-options', getTaskStatusOptions);
router.get('/search', searchTasksController);
router.get('/list', listViewController);
router.get('/calendar', calendarViewController);
router.get('/assigned', fetchAssignedTasks);
router.post('/reactions', addReactionController);
router.delete('/reactions/:id', removeReactionController);
router.get('/reactions', getReactionsController);
router.get('/:id', getSingleTask);
router.post('/', validateTask, validateRequest, createNewTask);
router.put('/:id', validateTaskUpdate, validateRequest, updateTaskById);
router.patch('/:id', validateTaskUpdate, validateRequest, updateTaskById);
router.delete('/:id', deleteTaskById);
router.post('/:id/dependencies', addTaskDependencyController);
router.delete('/:id/dependencies/:blockedById', removeTaskDependencyController);
router.get('/:id/dependencies', getTaskDependenciesController);

export default router;
