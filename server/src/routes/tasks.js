import express from 'express';
import {
    getTasks,
    getSingleTask,
    createNewTask,
    updateTaskById,
    deleteTaskById
} from '../controllers/taskController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getTasks);
router.get('/:id', getSingleTask);
router.post('/', createNewTask);
router.put('/:id', updateTaskById);
router.delete('/:id', deleteTaskById);

export default router;
