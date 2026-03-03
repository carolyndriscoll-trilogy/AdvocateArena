import { Request, Response, NextFunction, RequestHandler } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code?: string) {
    super(404, message, code);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code?: string) {
    super(403, message, code);
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code?: string) {
    super(400, message, code);
    this.name = 'BadRequestError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.path}:`, err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
    });
    return;
  }

  if (err.name === 'ZodError') {
    const zodError = err as any;
    res.status(400).json({
      message: zodError.errors?.[0]?.message || 'Validation error',
      field: zodError.errors?.[0]?.path?.join('.'),
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    message: isProduction ? 'Internal server error' : (err.message || 'Internal server error'),
    code: 'INTERNAL_ERROR',
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
