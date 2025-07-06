// controllers/taskController.js
import {
    getAllTasksByUser,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
} from '../models/Task.js';

export async function getTasks(req, res) {
    try {
        const tasks = await getAllTasksByUser(req.user.id);
        res.json({ success: true, tasks });
    } catch (err) {
         next(err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
}

export async function getSingleTask(req, res) {
    try {
        const task = await getTaskById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        res.json({ success: true, task });
    } catch (err) {
         next(err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
}

export async function createNewTask(req, res) {
    try {
        const { title, description, due_date, status } = req.body;
        if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

        const taskId = await createTask({
            title,
            description,
            due_date,
            status,
            created_by: req.user.id
        });

        res.status(201).json({ success: true, message: 'Task created', taskId });
    } catch (err) {
         next(err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
}

export async function updateTaskById(req, res) {
    try {
        const { title, description, due_date, status } = req.body;
        const taskId = req.params.id;

        const affectedRows = await updateTask(taskId, { title, description, due_date, status });
        if (affectedRows === 0) return res.status(404).json({ success: false, message: 'Task not found or unchanged' });

        res.json({ success: true, message: 'Task updated' });
    } catch (err) {
         next(err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
}

export async function deleteTaskById(req, res) {
    try {
        const taskId = req.params.id;
        const affectedRows = await deleteTask(taskId);

        if (affectedRows === 0) return res.status(404).json({ success: false, message: 'Task not found' });

        res.json({ success: true, message: 'Task deleted' });
    } catch (err) {
         next(err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
}
export async function getTasksByProject(req, res) {
    try {
        const projectId = req.params.projectId;
        const tasks = await getAllTasksByUser(req.user.id, projectId);
        res.json({ success: true, tasks });
    } catch (err) {
         next(err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
}