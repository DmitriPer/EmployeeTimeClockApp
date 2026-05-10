import pino from 'pino';

export const logger = pino({
  redact: [
    'req.headers.authorization',
    'req.body.password',
    'req.body.refreshToken',
  ],
});
