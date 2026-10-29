import { Router } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { HttpError } from '../middleware/errors.js';
import { validateSchedule } from '../../../shared/scheduling.js';

const router = Router();
const fields = ['title', 'description', 'project', 'priority', 'status', 'dueDate', 'schedule', 'expectedUpdatedAt'];

function validateBody(body, creating) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Provide a task as a JSON object.');
  const keys = Object.keys(body);
  if (!keys.length || keys.some(key => !fields.includes(key))) throw new HttpError(400, `Provide only supported task fields: ${fields.join(', ')}.`);
  if (keys.length === 1 && keys[0] === 'expectedUpdatedAt') throw new HttpError(400, 'Provide at least one task field to update.');
  if (creating && (!Object.hasOwn(body, 'title') || !Object.hasOwn(body, 'dueDate'))) throw new HttpError(400, 'Title and dueDate are required.');
  for (const key of keys) {
    if (key === 'schedule') {
      if (body.schedule !== null) {
        try { body.schedule = validateSchedule(body.schedule); } catch (error) { throw new HttpError(400, error.message); }
      }
      continue;
    }
    if (typeof body[key] !== 'string') throw new HttpError(400, `${key} must be a string.`);
  }
  if (body.expectedUpdatedAt !== undefined && (creating || !Number.isFinite(Date.parse(body.expectedUpdatedAt)))) throw new HttpError(400, 'expectedUpdatedAt must be a valid timestamp on an update.');
  if (Object.hasOwn(body, 'dueDate')) {
    const date = new Date(`${body.dueDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.dueDate) {
      throw new HttpError(400, 'dueDate must be a valid calendar date in YYYY-MM-DD format.');
    }
  }
  return body;
}

router.param('id', (_request, _response, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return next(new HttpError(400, 'Invalid task ID.'));
  next();
});

router.get('/', async (_request, response) => {
  const tasks = await Task.find().sort({ createdAt: 1, _id: 1 });
  response.json({ tasks });
});

router.post('/', async (request, response) => {
  const body = validateBody(request.body, true);
  if (body.schedule && body.status === 'Completed') throw new HttpError(409, 'Completed tasks cannot receive a new time block.');
  if (body.schedule) await checkScheduleConflict(body.schedule);
  const task = await Task.create(body);
  response.status(201).json({ task });
});

router.put('/:id', async (request, response) => {
  const changes = validateBody(request.body, false);
  const task = await Task.findById(request.params.id);
  if (!task) throw new HttpError(404, 'Task not found.');
  const { expectedUpdatedAt, ...fields } = changes;
  if (expectedUpdatedAt && task.updatedAt.toISOString() !== expectedUpdatedAt) throw new HttpError(409, 'This task changed since the plan was generated. Refresh tasks and regenerate before saving.');
  if (fields.schedule && (fields.status || task.status) === 'Completed') throw new HttpError(409, 'Completed tasks cannot receive a new time block. Reopen the task before scheduling it.');
  if (fields.schedule) await checkScheduleConflict(fields.schedule, task.id);
  task.set(fields);
  await task.save();
  response.json({ task });
});

router.delete('/:id', async (request, response) => {
  const task = await Task.findByIdAndDelete(request.params.id);
  if (!task) throw new HttpError(404, 'Task not found.');
  response.status(204).end();
});

export default router;

async function checkScheduleConflict(schedule, taskId) {
  const conflict = await Task.exists({
    ...(taskId ? { _id: { $ne: taskId } } : {}),
    status: { $ne: 'Completed' },
    'schedule.date': schedule.date, 'schedule.timeZone': schedule.timeZone,
    'schedule.startTime': { $lt: schedule.endTime }, 'schedule.endTime': { $gt: schedule.startTime },
  });
  if (conflict) throw new HttpError(409, 'Another saved task overlaps this time block. Remove or update its saved time in Daily Planner, then retry.');
}
