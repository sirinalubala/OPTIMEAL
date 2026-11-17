import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pool from './config/db.js';
import authRoutes from './routes/auth.js';
import recordRoutes from './routes/records.js';
import analyticsRoutes from './routes/analytics.js';
import predictionRoutes from './routes/predictions.js';
import calendarRoutes from './routes/calendar.js';
import billRoutes from './routes/bills.js';
import { notFound, errorHandler } from './middleware/errors.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
  throw new Error('JWT_SECRET must be set to a random string of at least 24 characters.');
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/bills', billRoutes);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`OptiMeal API listening on http://localhost:${port}`));
