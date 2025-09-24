// Minimal test server to identify route parameter issues
import express from 'express';
import cors from 'cors';

const app = express();

// Basic CORS
app.use(cors({
  origin: 'https://worksync-app.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test route with parameter
app.get('/api/test/:id', (req, res) => {
  res.json({ id: req.params.id });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});