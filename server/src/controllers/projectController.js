// controllers/projectController.js
import {
  getAllProjectsForUser,
  getProjectById,
  createNewProject,
  updateProjectById,
  deleteProjectById,
  searchProjects
} from '../models/Project.js';

export const getAllProjects = async (req, res, next) => {
  try {
    const projects = await getAllProjectsForUser(req.user.id);
    res.json({ success: true, projects });
  } catch (err) {
     next(err);
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProject = async (req, res, next) => {
  try {
    const project = await getProjectById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createProject = async (req, res, next) => {
  const { name, description, status } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  try {
    const projectId = await createNewProject({
      userId: req.user.id,
      name,
      description,
      status
    });

    res.status(201).json({
      success: true,
      message: 'Project created',
      project: { id: projectId, name, description, status }
    });
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const updateProject = async (req, res, next) => {
  const { id } = req.params;
  const { name, description, status } = req.body;

  try {
    const updated = await updateProjectById({
      id,
      userId: req.user.id,
      name,
      description,
      status
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    res.json({ success: true, message: 'Project updated' });
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const deleted = await deleteProjectById(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export async function searchProjectsController(req, res, next) {
  try {
    const { q, status } = req.query;
    const userId = req.user.id;
    const projects = await searchProjects({ userId, q, status });
    res.json({ success: true, projects });
  } catch (error) {
    next(error);
  }
}
