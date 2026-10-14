import express from 'express';
import { demoRows, departments, summarize } from './statistics.js';

export function createApp({ loadRows = async () => demoRows, source = 'demo' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', source }));
  app.get('/api/statistics', async (req, res) => {
    const months = Number(req.query.months ?? 12);
    const department = req.query.department ?? 'all';
    if (![3, 6, 12].includes(months) || (department !== 'all' && !departments.includes(department))) {
      return res.status(400).json({ error: 'Choose 3, 6, or 12 months and a valid department.' });
    }
    try {
      const rows = await loadRows();
      res.json({ ...summarize(rows, months, department), source, departments, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Statistics query failed:', error.message);
      res.status(503).json({ error: 'Statistics are unavailable. Please try again shortly.' });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  return app;
}
