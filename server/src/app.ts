import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import cookieParser from 'cookie-parser';
import { ErrorCode } from '@app/shared';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';
import { authRouter } from './auth/auth.routes.js';
import { timeclockRouter } from './timeclock/timeclock.routes.js';
import { historyRouter } from './history/history.routes.js';
import { usersRouter } from './users/users.routes.js';
import { managerRouter } from './manager/manager.routes.js';
import { exportRouter } from './export/export.routes.js';

export const app = express();

app.use(helmet({ frameguard: { action: 'deny' } }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.use('/api/auth', authRouter);
app.use('/api/timeclock', timeclockRouter);
app.use('/api/history', historyRouter);
app.use('/api/users', usersRouter);
app.use('/api/manager', managerRouter);
app.use('/api/export', exportRouter);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: ErrorCode.NOT_FOUND, message: 'Route not found' },
  });
});

app.use(errorHandler);
