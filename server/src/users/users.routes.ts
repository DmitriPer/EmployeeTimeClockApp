import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@app/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { findAllUsers } from './users.repository.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  '/',
  requireRoles(UserRole.MANAGER, UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await findAllUsers();
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },
);
