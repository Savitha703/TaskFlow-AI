import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import taskRoutes from './routes/tasks.js';
import { createAiRouter } from './routes/ai.js';
import { generatePlan } from './services/planner.js';
import { generateDailyPlan } from './services/dailyPlanner.js';
import { createDailyPlannerRouter, loadDailyTasks } from './routes/dailyPlanner.js';
import { errorHandler, HttpError } from './middleware/errors.js';

export function createApp({ clientOrigins = ['http://localhost:5173'], planGenerator = generatePlan, dailyPlanGenerator = generateDailyPlan, dailyTaskLoader = loadDailyTasks, serveFrontend = false, staticDirectory = fileURLToPath(new URL('../../dist/', import.meta.url)) } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Elastic Beanstalk's local NGINX proxy supplies X-Forwarded-Proto for HTTPS.
  if (serveFrontend) app.set('trust proxy', 1);
  app.use(cors((request, callback) => {
    const origin = request.get('Origin');
    const sameOrigin = origin === `${request.protocol}://${request.get('host')}`;
    if (origin && !sameOrigin && !clientOrigins.includes(origin)) return callback(new HttpError(403, 'This frontend origin is not allowed. Check the CLIENT_ORIGIN server environment variable.'));
    callback(null, { origin: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type'] });
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/ai', createAiRouter(planGenerator));
  app.use('/api/ai', createDailyPlannerRouter(dailyPlanGenerator, dailyTaskLoader));
  app.get('/api/health', (_request, response) => {
    const connected = mongoose.connection.readyState === 1;
    response.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected' });
  });
  app.use('/api/tasks', (_request, _response, next) => {
    if (mongoose.connection.readyState !== 1) return next(new HttpError(503, 'Database is unavailable. Try again shortly.'));
    next();
  }, taskRoutes);
  // An unknown API URL must remain a JSON 404, never the React HTML document.
  app.use('/api', (_request, _response, next) => next(new HttpError(404, 'API endpoint not found.')));
  if (serveFrontend) {
    app.use(express.static(staticDirectory, { index: false, dotfiles: 'deny' }));
    app.use((request, response, next) => {
      if (!['GET','HEAD'].includes(request.method) || request.path.startsWith('/assets/') || request.path.split('/').some(segment=>segment.startsWith('.')) || path.extname(request.path) || !request.accepts('html')) return next();
      response.set('Cache-Control', 'no-cache');
      response.sendFile('index.html', { root: staticDirectory });
    });
  }
  app.use((_request, _response, next) => next(new HttpError(404, 'API endpoint not found.')));
  app.use(errorHandler);
  return app;
}
