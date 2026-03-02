import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { db, closeDb } from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────

// Route modules will be uncommented as they are implemented:
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import teamRoutes from './routes/teams.js';
import lobbyRoutes from './routes/lobbies.js';
import matchRoutes from './routes/matches.js';
import fieldRoutes from './routes/fields.js';
import paymentRoutes from './routes/payments.js';
import socialRoutes from './routes/social.js';
import trainingRoutes from './routes/training.js';
import messagesRoutes from './routes/messages.js';
import notificationsRoutes from './routes/notifications.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/lobbies', lobbyRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);

// ── Health Check ────────────────────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response) => {
  const tableCount = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .get() as { count: number };

  res.json({
    status: 'ok',
    database: 'connected',
    tables: tableCount.count,
  });
});

// ── Global Error Handler ────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// ── Start Server ────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`[FootyFinder API] Running on http://localhost:${PORT}`);
  console.log(`[FootyFinder API] Health check: http://localhost:${PORT}/api/health`);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────

function shutdown() {
  console.log('\n[FootyFinder API] Shutting down...');
  server.close(() => {
    closeDb();
    console.log('[FootyFinder API] Goodbye.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
