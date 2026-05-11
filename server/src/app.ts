import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import cookieParser from 'cookie-parser';
import { ErrorCode } from '@app/shared';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';
import { authRouter } from './auth/auth.routes.js';

export const app = express();

app.use(helmet({ frameguard: { action: 'deny' } }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.use('/api/auth', authRouter);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: ErrorCode.NOT_FOUND, message: 'Route not found' },
  });
});

app.use(errorHandler);
