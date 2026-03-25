import { Router, Request, Response } from 'express';
import { cartService } from '../services/index.js';
import { asyncHandler, validate, validateParam } from '../middleware/index.js';
import { addToCartSchema, updateQuantitySchema, applyDiscountSchema } from '../middleware/validation.js';

const router = Router();

// POST /api/cart - Create new cart
router.post(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const cart = cartService.createCart();

    res.status(201).json({
      success: true,
      data: {
        cartId: cart.id,
        items: cart.items,
        subtotal: cart.subtotal,
        discountTotal: cart.discountTotal,
        total: cart.total,
        currency: cart.currency,
      },
    });
  })
);

// GET /api/cart/:id - Get cart
router.get(
  '/:id',
  validateParam('id'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const cart = cartService.getCart(id);

    if (!cart) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CART_NOT_FOUND',
          message: 'Cart not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        cartId: cart.id,
        items: cart.items,
        subtotal: cart.subtotal,
        appliedDiscounts: cart.appliedDiscounts,
        discountTotal: cart.discountTotal,
        total: cart.total,
        currency: cart.currency,
      },
    });
  })
);

// POST /api/cart/:id/items - Add item to cart
router.post(
  '/:id/items',
  validateParam('id'),
  validate(addToCartSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { productId, quantity } = req.body;

    const cart = cartService.addToCart(id, productId, quantity);

    res.json({
      success: true,
      data: {
        cartId: cart.id,
        items: cart.items,
        subtotal: cart.subtotal,
        appliedDiscounts: cart.appliedDiscounts,
        discountTotal: cart.discountTotal,
        total: cart.total,
      },
    });
  })
);

// DELETE /api/cart/:id/items/:productId - Remove item from cart
router.delete(
  '/:id/items/:productId',
  validateParam('id'),
  validateParam('productId'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, productId } = req.params;
    const cart = cartService.removeFromCart(id, productId);

    res.json({
      success: true,
      data: {
        cartId: cart.id,
        items: cart.items,
        subtotal: cart.subtotal,
        appliedDiscounts: cart.appliedDiscounts,
        discountTotal: cart.discountTotal,
        total: cart.total,
      },
    });
  })
);

// PATCH /api/cart/:id/items/:productId - Update item quantity
router.patch(
  '/:id/items/:productId',
  validateParam('id'),
  validateParam('productId'),
  validate(updateQuantitySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, productId } = req.params;
    const { quantity } = req.body;

    const cart = cartService.updateQuantity(id, productId, quantity);

    res.json({
      success: true,
      data: {
        cartId: cart.id,
        items: cart.items,
        subtotal: cart.subtotal,
        appliedDiscounts: cart.appliedDiscounts,
        discountTotal: cart.discountTotal,
        total: cart.total,
      },
    });
  })
);

// POST /api/cart/:id/discount - Apply discount code
router.post(
  '/:id/discount',
  validateParam('id'),
  validate(applyDiscountSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { code } = req.body;

    const { discountService } = await import('../services/index.js');
    const cart = discountService.applyDiscount(id, code);

    res.json({
      success: true,
      data: {
        cartId: cart.id,
        items: cart.items,
        subtotal: cart.subtotal,
        appliedDiscounts: cart.appliedDiscounts,
        discountTotal: cart.discountTotal,
        total: cart.total,
      },
    });
  })
);

// DELETE /api/cart/:id/discount/:code - Remove discount
router.delete(
  '/:id/discount/:code',
  validateParam('id'),
  validateParam('code'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, code } = req.params;
    const { discountService } = await import('../services/index.js');
    const cart = discountService.removeDiscount(id, code);

    res.json({
      success: true,
      data: {
        cartId: cart.id,
        items: cart.items,
        subtotal: cart.subtotal,
        appliedDiscounts: cart.appliedDiscounts,
        discountTotal: cart.discountTotal,
        total: cart.total,
      },
    });
  })
);

// DELETE /api/cart/:id - Clear cart
router.delete(
  '/:id',
  validateParam('id'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const cart = cartService.clearCart(id);

    res.json({
      success: true,
      data: {
        cartId: cart.id,
        items: cart.items,
        subtotal: cart.subtotal,
        total: cart.total,
      },
    });
  })
);

export default router;