import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { UserRole, CreateUserSchema, UpdateUserSchema, ResetPasswordSchema, ChangePasswordSchema, ErrorCode } from '@app/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { AppError } from '../lib/errors.js';
import * as service from './users.service.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.patch(
  '/me/password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ChangePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Validation error.', 400, ErrorCode.VALIDATION_ERROR);
      }
      await service.changeOwnPassword(req.user!.id, parsed.data);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.get(
  '/me',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.getOwnProfile(req.user!.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.get(
  '/',
  requireRoles(UserRole.MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.listUsers(req.user!);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.post(
  '/',
  requireRoles(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Validation error.', 400, ErrorCode.VALIDATION_ERROR);
      }
      const result = await service.createUser(parsed.data);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.patch(
  '/:id',
  requireRoles(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id ?? ''), 10);
      if (isNaN(id)) throw new AppError('Invalid user ID.', 400, ErrorCode.VALIDATION_ERROR);

      const parsed = UpdateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Validation error.', 400, ErrorCode.VALIDATION_ERROR);
      }
      const result = await service.updateUser(id, parsed.data);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.patch(
  '/:id/reset-password',
  requireRoles(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id ?? ''), 10);
      if (isNaN(id)) throw new AppError('Invalid user ID.', 400, ErrorCode.VALIDATION_ERROR);

      const parsed = ResetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Validation error.', 400, ErrorCode.VALIDATION_ERROR);
      }
      await service.resetUserPassword(id, parsed.data);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.patch(
  '/:id/deactivate',
  requireRoles(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id ?? ''), 10);
      if (isNaN(id)) throw new AppError('Invalid user ID.', 400, ErrorCode.VALIDATION_ERROR);

      const result = await service.deactivateUser(req.user!.id, id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);
