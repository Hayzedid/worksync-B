import { createSubtask, updateSubtask, getSubtasksForTask } from '../models/Subtask.js';

export async function addSubtask(req, res, next) {
  try {
    const { id } = req.params; // task id
    const { title } = req.body;
    const subtaskId = await createSubtask({ task_id: id, title });
    res.status(201).json({ success: true, subtaskId });
  } catch (error) {
    next(error);
  }
}

export async function updateSubtaskHandler(req, res, next) {
  try {
    const { id } = req.params; // subtask id
    const { completed } = req.body;
    await updateSubtask({ id, completed });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getSubtasksForTaskHandler(req, res, next) {
  try {
    const { id } = req.params; // task id
    const subtasks = await getSubtasksForTask(id);
    res.json({ success: true, subtasks });
  } catch (error) {
    next(error);
  }
} 