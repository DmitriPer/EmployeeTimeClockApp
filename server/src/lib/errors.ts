import { ErrorCode } from '@app/shared';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: ErrorCode,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
