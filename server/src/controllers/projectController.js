import e from 'express';

// controllers/projectsController.js
import { pool } from '../config/database.js';
// GET all projects for authenticated user
export const getAllProjects = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM projects WHERE owner_id = ?',
      [userId]
    );
    res.json({ success: true, projects: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET a single project by id
export const getProjectById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
      [id, userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, project: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// CREATE a new project
export const createProject = async (req, res) => {
  const userId = req.user.id;
  const { name, description, status } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO projects (owner_id, name, description, status) VALUES (?, ?, ?, ?)',
      [userId, name, description || '', status || 'active']
    );
    res.status(201).json({
      success: true,
      message: 'Project created',
      project: { id: result.insertId, user_id: userId, name, description, status }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error',  error: err.message});
  }
};

// UPDATE an existing project
export const updateProject = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description, status } = req.body;

  try {
    const [result] = await pool.execute(
      'UPDATE projects SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, description, status, id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found or not yours' });
    }
    res.json({ success: true, message: 'Project updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE a project
export const deleteProject = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const [result] = await pool.execute(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found or not yours' });
    }
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


  // const userId = req.user.id;
  // const projectId = req.params.id;

  // try {
  //   const [results] = await pool.execute(
  //     'SELECT * FROM projects WHERE id = ? AND user_id = ?',
  //     [projectId, userId]
  //   );

  //   if (results.length === 0) {
  //     return res.status(404).json({ success: false, message: 'Projects not found' });
  //   }

  //   res.status(200).json({
  //     success: true,
  //     project: results[0],
  //   });
  // } catch (err) {
  //   console.error('Error fetching project by ID:', err);
  //   res.status(500).json({ success: false, message: 'Server error' });
  // }