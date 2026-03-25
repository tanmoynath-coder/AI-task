import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/index.js';

export class AppError extends Error {
  public readonly code: ApiError['code'];
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ApiError['code'], message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static fromApiError(apiError: ApiError, statusCode: number = 400): AppError {
    return new AppError(apiError.code, apiError.message, statusCode, apiError.details);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(`Error: ${err.message}`, err instanceof AppError ? err.details : undefined);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error factory functions
export const createError = {
  notFound: (resource: string): AppError =>
    new AppError('CART_NOT_FOUND', `${resource} not found`, 404),

  badRequest: (code: ApiError['code'], message: string, details?: Record<string, unknown>): AppError =>
    new AppError(code, message, 400, details),

  conflict: (code: ApiError['code'], message: string): AppError =>
    new AppError(code, message, 409),

  unprocessable: (code: ApiError['code'], message: string, details?: Record<string, unknown>): AppError =>
    new AppError(code, message, 422, details),
};