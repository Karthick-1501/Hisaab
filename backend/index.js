import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload.js';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use('/upload', uploadRouter);

// Phase 2+ routes (stubs — wired in later phases)
// app.use('/review',       reviewRouter);
// app.use('/transactions', transactionsRouter);
// app.use('/dashboard',    dashboardRouter);
// app.use('/budgets',      budgetsRouter);

// ── Health check ──────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: err.message });
  }
});

// ── 404 catch-all ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Money Manager backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Upload: POST http://localhost:${PORT}/upload`);
});
