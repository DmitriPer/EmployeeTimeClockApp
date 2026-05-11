import { Router } from 'express';
import { handleLogin, handleLogout, handleRefresh } from './auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, handleLogin);
authRouter.post('/refresh', handleRefresh);
authRouter.post('/logout', requireAuth, handleLogout);