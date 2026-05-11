import { Router } from 'express';
import { handleLogin, handleLogout } from './auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, handleLogin);
authRouter.post('/logout', requireAuth, handleLogout);