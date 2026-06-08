import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { 
  createAssignment, 
  getAssignments, 
  getAssignmentById, 
  regenerateAssignment,
  deleteAssignment,
  downloadAssignmentPDF,
  updateAssignmentLifecycleStatus
} from './controllers/assignment.controller';
import { authMiddleware } from './middleware/auth';
import { register, login, getMe, updateProfile } from './controllers/auth.controller';

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) ||
                      origin.endsWith('.vercel.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Ensure the static PDFs public directory exists
const pdfsDir = path.join(__dirname, '../public/pdfs');
fs.mkdirSync(pdfsDir, { recursive: true });

// Serve static PDF outputs without browser caching
app.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));

// Root Welcome / Redirect API
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the QRaft AI Assessment Creator API',
    healthCheck: '/api/health',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'QRaft AI Assessment Creator API' });
});

// Authentication Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authMiddleware, getMe);
app.put('/api/auth/update', authMiddleware, updateProfile);

// RESTful Core API Endpoints (Protected by Auth)
app.post('/api/assignments', authMiddleware, createAssignment);
app.get('/api/assignments', authMiddleware, getAssignments);
app.get('/api/assignments/:id', authMiddleware, getAssignmentById);
app.get('/api/assignments/:id/download', authMiddleware, downloadAssignmentPDF);
app.post('/api/assignments/:id/regenerate', authMiddleware, regenerateAssignment);
app.delete('/api/assignments/:id', authMiddleware, deleteAssignment);
app.patch('/api/assignments/:id/status', authMiddleware, updateAssignmentLifecycleStatus);

export default app;
