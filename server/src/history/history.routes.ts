import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { handleGetHistory, handleUpdateNote } from './history.controller.js';

export const historyRouter = Router();

historyRouter.use(requireAuth);

historyRouter.get('/', handleGetHistory);
historyRouter.patch('/entries/:entryId/note', handleUpdateNote);
