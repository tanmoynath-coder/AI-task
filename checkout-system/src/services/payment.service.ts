import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../repositories/index.js';
import { Cart, Order, Payment, ApiError, ErrorCode } from '../types/index.js';

// Initialize Stripe with secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key';
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

export class PaymentService {
  async createPaymentIntent(cartId: string): Promise<{ payment: Payment; clientSecret: string }> {
    const cart = store.getCart(cartId);
    if (!cart) {
      throw this.createError('CART_NOT_FOUND', 'Cart not found');
    }

    if (cart.items.length === 0) {
      throw this.createError('EMPTY_CART', 'Cannot checkout with empty cart');
    }

    if (cart.total <= 0) {
      throw this.createError('EMPTY_CART', 'Invalid cart total');
    }

    // Check for existing pending order/payment to reuse
    let order = store.getAllOrders().find(o => o.cartId === cartId && (o.status === 'pending' || o.status === 'awaiting_payment'));
    let payment: Payment | undefined;

    if (order && order.paymentId) {
      payment = store.getPayment(order.paymentId);
    }

    if (!order) {
      order = this.createOrderFromCart(cart);
    }

    try {
      // Create Stripe PaymentIntent with idempotency key
      // We use cartId as the idempotency key to prevent duplicate intents for the same checkout attempt
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cart.total,
        currency: cart.currency,
        metadata: {
          cartId,
          orderId: order.id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      }, {
        idempotencyKey: `pi_${cartId}_${cart.total}_${cart.updatedAt.getTime()}`,
      });

      if (!payment) {
        payment = {
          id: uuidv4(),
          orderId: order.id,
          amount: cart.total,
          currency: cart.currency,
          status: 'pending',
          stripePaymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret!,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.setPayment(payment.id, payment);
        order.paymentId = payment.id;
      } else {
        // Update existing payment if it changed (e.g., Stripe ID if it was missing)
        payment.stripePaymentIntentId = paymentIntent.id;
        payment.clientSecret = paymentIntent.client_secret!;
        payment.updatedAt = new Date();
        store.setPayment(payment.id, payment);
      }

      order.status = 'awaiting_payment';
      store.setOrder(order.id, order);

      return { payment, clientSecret: paymentIntent.client_secret! };
    } catch (error) {
      // Don't cancel immediately, allow retry
      throw this.createError('PAYMENT_FAILED', 'Failed to initialize payment');
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<Payment> {
    const payment = store.getPaymentByStripeId(paymentIntentId);
    if (!payment) {
      throw this.createError('PAYMENT_FAILED', 'Payment not found');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const order = store.getOrder(payment.orderId);
        if (order && order.status !== 'paid') {
          // Atomic inventory reservation
          const success = store.reserveInventoryAtomic(order.items);
          if (success) {
            payment.status = 'succeeded';
            order.status = 'paid';
            order.updatedAt = new Date();
            store.setOrder(order.id, order);
          } else {
            payment.status = 'failed';
            payment.errorMessage = 'Inventory no longer available';
            order.status = 'cancelled';
            store.setOrder(order.id, order);
          }
        }
      } else if (paymentIntent.status === 'canceled') {
        payment.status = 'cancelled';
        const order = store.getOrder(payment.orderId);
        if (order) {
          order.status = 'cancelled';
          store.setOrder(order.id, order);
        }
      }

      payment.updatedAt = new Date();
      store.setPayment(payment.id, payment);
      return payment;
    } catch (error) {
      throw this.createError('PAYMENT_FAILED', 'Failed to confirm payment');
    }
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = store.getPayment(paymentId);
    if (!payment) {
      throw this.createError('PAYMENT_FAILED', 'Payment not found');
    }

    if (payment.status !== 'succeeded') {
      throw this.createError('PAYMENT_FAILED', 'Cannot refund non-successful payment');
    }

    try {
      await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
      });

      payment.status = 'refunded';
      payment.updatedAt = new Date();
      store.setPayment(payment.id, payment);

      const order = store.getOrder(payment.orderId);
      if (order) {
        order.status = 'refunded';
        store.setOrder(order.id, order);
        // Atomic inventory restoration
        store.restoreInventoryAtomic(order.items);
      }

      return payment;
    } catch (error) {
      throw this.createError('PAYMENT_FAILED', 'Failed to process refund');
    }
  }

  handleWebhook(payload: string | Buffer, signature: string): { received: boolean } {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    try {
      if (!webhookSecret) {
        throw new Error('Missing STRIPE_WEBHOOK_SECRET');
      }
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw this.createError('PAYMENT_FAILED', 'Invalid webhook signature');
    }

    // Idempotency check: Have we processed this event before?
    if (store.isEventProcessed(event.id)) {
      console.info(`Duplicate webhook event ignored: ${event.id}`);
      return { received: true };
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          console.warn(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed only after successful handling
      store.markEventProcessed(event.id);
    } catch (error) {
      console.error(`Error handling webhook ${event.type}:`, error);
      throw error; // Let Express return 500 so Stripe retries
    }

    return { received: true };
  }

  private handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): void {
    const payment = store.getPaymentByStripeId(paymentIntent.id);
    if (payment && payment.status !== 'succeeded') {
      const order = store.getOrder(payment.orderId);
      if (order && order.status !== 'paid') {
        const success = store.reserveInventoryAtomic(order.items);
        if (success) {
          payment.status = 'succeeded';
          order.status = 'paid';
          store.setOrder(order.id, order);
        } else {
          // This is a rare edge case where inventory was taken between payment and webhook
          // In production, you'd trigger a manual alert or auto-refund
          payment.status = 'failed';
          payment.errorMessage = 'Oversold: Inventory no longer available';
          order.status = 'cancelled';
          store.setOrder(order.id, order);
          console.error(`Oversold critical error for order ${order.id}`);
        }
        payment.updatedAt = new Date();
        store.setPayment(payment.id, payment);
      }
    }
  }

  private handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): void {
    const payment = store.getPaymentByStripeId(paymentIntent.id);
    if (payment) {
      payment.status = 'failed';
      payment.errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
      payment.updatedAt = new Date();
      store.setPayment(payment.id, payment);

      const order = store.getOrder(payment.orderId);
      if (order && order.status === 'awaiting_payment') {
        // Keep order around so user can try again
        order.status = 'pending'; 
        store.setOrder(order.id, order);
      }
    }
  }

  private createOrderFromCart(cart: Cart): Order {
    const order: Order = {
      id: uuidv4(),
      cartId: cart.id,
      items: [...cart.items],
      subtotal: cart.subtotal,
      discountTotal: cart.discountTotal,
      total: cart.total,
      currency: cart.currency,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.setOrder(order.id, order);
    return order;
  }

  private createError(code: ErrorCode, message: string): ApiError {
    return { code, message };
  }
}

export const paymentService = new PaymentService();