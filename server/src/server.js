import express from 'express';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import noteRoutes from './routes/notes.js';
import {testConnection} from './config/database.js';

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/', taskRoutes);
app.use('/api/notes', noteRoutes);

testConnection();


export default app;
