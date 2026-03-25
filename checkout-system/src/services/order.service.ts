import { store } from '../repositories/index.js';
import { Order, ApiError } from '../types/index.js';

export class OrderService {
  getOrder(orderId: string): Order | null {
    return store.getOrder(orderId) || null;
  }

  getOrderByPaymentIntentId(stripePaymentIntentId: string): Order | null {
    const payment = store.getPaymentByStripeId(stripePaymentIntentId);
    if (!payment) return null;
    return store.getOrder(payment.orderId) || null;
  }

  updateOrderStatus(orderId: string, status: Order['status']): Order {
    const order = store.getOrder(orderId);
    if (!order) {
      throw this.createError('ORDER_NOT_FOUND', 'Order not found');
    }

    const validTransitions: Record<string, Order['status'][]> = {
      pending: ['awaiting_payment', 'cancelled'],
      awaiting_payment: ['paid', 'cancelled'],
      paid: ['processing', 'refunded'],
      processing: ['completed', 'refunded'],
      completed: ['refunded'],
      cancelled: [],
      refunded: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      throw this.createError(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition from ${order.status} to ${status}`
      );
    }

    order.status = status;
    order.updatedAt = new Date();
    store.setOrder(orderId, order);
    return order;
  }

  cancelOrder(orderId: string): Order {
    return this.updateOrderStatus(orderId, 'cancelled');
  }

  private createError(code: ApiError['code'], message: string): ApiError {
    return { code, message };
  }
}

export const orderService = new OrderService();