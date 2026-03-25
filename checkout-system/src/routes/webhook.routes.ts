import { Router, Request, Response } from 'express';
import { paymentService } from '../services/index.js';

const router = Router();

// POST /api/webhooks/stripe - Stripe webhook handler
router.post(
  '/stripe',
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;

    try {
      // req.body is a Buffer because of express.raw() in index.ts
      paymentService.handleWebhook(req.body, signature);

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'WEBHOOK_ERROR',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Webhook processing failed',
        },
      });
    }
  }
);

export default router;