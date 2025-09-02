import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routers
import { authRouter } from './auth.js';
// Future: import { receiptsRouter } from './receipts.js';

// Load environment variables
dotenv.config();

const app = express();

// --- Middleware ---
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// --- Health Check Endpoint ---
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'UP' });
});

// --- API Routers ---
app.use('/api/auth', authRouter);
// Future: app.use('/api/receipts', receiptsRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
