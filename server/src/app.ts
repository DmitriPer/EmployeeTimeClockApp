import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { ErrorCode } from '@app/shared';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';

export const app = express();

app.use(helmet({ frameguard: { action: 'deny' } }));
app.use(express.json());
app.use(pinoHttp({ logger }));

// Routes mounted here in later stories

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: ErrorCode.NOT_FOUND, message: 'Route not found' },
  });
});

app.use(errorHandler);
