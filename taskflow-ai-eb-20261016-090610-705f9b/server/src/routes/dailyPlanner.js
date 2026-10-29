import { Router } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { HttpError } from '../middleware/errors.js';
import { validateDailyPreferences } from '../../../shared/scheduling.js';

export async function loadDailyTasks() {
  if (mongoose.connection.readyState !== 1) throw new HttpError(503, 'Database is unavailable. Reconnect MongoDB before planning your day.');
  return Task.find({ status: { $ne: 'Completed' } }).select('title priority status dueDate updatedAt').lean();
}
export function createDailyPlannerRouter(generate, loadTasks = loadDailyTasks) {
  const router = Router();
  router.post('/daily-plan', async (request, response) => {
    let preferences;
    try { preferences = validateDailyPreferences(request.body); } catch (error) { throw new HttpError(400, error.message); }
    const tasks = await loadTasks();
    response.json(await generate(tasks, preferences));
  });
  return router;
}
