import { Router, Request, Response } from 'express';
import { paymentService } from '../services/index.js';
import { asyncHandler, validate, validateParam } from '../middleware/index.js';
import { createPaymentIntentSchema } from '../middleware/validation.js';

const router = Router();

// POST /api/checkout/create-payment-intent - Initialize payment
router.post(
  '/create-payment-intent',
  validate(createPaymentIntentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { cartId } = req.body;
    const result = await paymentService.createPaymentIntent(cartId);

    res.json({
      success: true,
      data: {
        clientSecret: result.clientSecret,
        paymentIntentId: result.payment.stripePaymentIntentId,
        amount: result.payment.amount,
        currency: result.payment.currency,
      },
    });
  })
);

// POST /api/checkout/confirm - Confirm payment (for testing without webhooks)
router.post(
  '/confirm',
  asyncHandler(async (req: Request, res: Response) => {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Payment intent ID is required',
        },
      });
      return;
    }

    const payment = await paymentService.confirmPayment(paymentIntentId);

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      },
    });
  })
);

// GET /api/orders/:id - Get order status
router.get(
  '/orders/:id',
  validateParam('id'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { orderService } = await import('../services/index.js');
    const order = orderService.getOrder(id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        items: order.items,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
      },
    });
  })
);

export default router;