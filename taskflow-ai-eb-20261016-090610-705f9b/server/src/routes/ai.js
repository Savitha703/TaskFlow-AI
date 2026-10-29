import { Router } from 'express';
import { HttpError } from '../middleware/errors.js';

export function createAiRouter(generatePlan) {
  const router = Router();
  router.post('/plan', async (request, response) => {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'goal') || typeof body.goal !== 'string' || !body.goal.trim() || body.goal.trim().length > 1000) {
      throw new HttpError(400, 'Provide a goal containing 1–1000 characters.');
    }
    response.json(await generatePlan(body.goal.trim()));
  });
  return router;
}
