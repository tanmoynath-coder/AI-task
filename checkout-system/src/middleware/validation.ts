import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createError } from './errorHandler.js';

// Validation schemas
export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const updateQuantitySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity must be 0 or greater'),
});

export const applyDiscountSchema = z.object({
  code: z.string().min(1, 'Discount code is required').max(50, 'Discount code too long'),
});

export const createPaymentIntentSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
});

export const webhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.unknown(),
  }),
});

// Validation middleware factory
export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {} as Record<string, string>);

        next(createError.badRequest('INVALID_INPUT', 'Validation failed', details));
        return;
      }
      next(error);
    }
  };
}

// Param validation
export function validateParam(name: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[name];
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      next(createError.badRequest('INVALID_INPUT', `Invalid ${name}`));
      return;
    }
    next();
  };
}