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
    kanbanViewController,
    listViewController,
    calendarViewController
} from '../controllers/taskController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getTasks);
router.get('/search', searchTasksController);
router.get('/kanban', kanbanViewController);
router.get('/list', listViewController);
router.get('/calendar', calendarViewController);
router.get('/:id', getSingleTask);
router.post('/', createNewTask);
router.put('/:id', updateTaskById);
router.delete('/:id', deleteTaskById);
router.get('/assigned', fetchAssignedTasks);
router.post('/:id/dependencies', addTaskDependencyController);
router.delete('/:id/dependencies/:blockedById', removeTaskDependencyController);
router.get('/:id/dependencies', getTaskDependenciesController);
router.post('/reactions', addReactionController);
router.delete('/reactions/:id', removeReactionController);
router.get('/reactions', getReactionsController);

export default router;
