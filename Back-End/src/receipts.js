import { Router } from 'express';
import { requireAuth } from './middleware/auth.js';

export const receiptsRouter = Router();

// All routes in this file are protected and require a valid JWT
receiptsRouter.use(requireAuth);

// Example protected route: Get all receipts for the logged-in user
receiptsRouter.get('/', (req, res) => {
  const userId = req.user.id;
  res.json({
    message: `This is a protected route. You are user ID: ${userId}.`,
    receipts: [] // Placeholder for actual database query
  });
});
