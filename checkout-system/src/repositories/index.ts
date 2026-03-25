import { Product, Cart, Discount, Order, Payment } from '../types/index.js';

// In-memory storage (replace with database in production)
class InMemoryStore {
  private products: Map<string, Product> = new Map();
  private carts: Map<string, Cart> = new Map();
  private discounts: Map<string, Discount> = new Map();
  private orders: Map<string, Order> = new Map();
  private payments: Map<string, Payment> = new Map();
  private processedEvents: Set<string> = new Set();

  // Products
  setProduct(id: string, product: Product): void {
    this.products.set(id, product);
  }

  getProduct(id: string): Product | undefined {
    return this.products.get(id);
  }

  getAllProducts(): Product[] {
    return Array.from(this.products.values()).filter((p) => p.active);
  }

  updateProductInventory(id: string, quantity: number): boolean {
    const product = this.products.get(id);
    if (!product) return false;
    product.inventory += quantity;
    product.updatedAt = new Date();
    return true;
  }

  // Carts
  setCart(id: string, cart: Cart): void {
    this.carts.set(id, cart);
  }

  getCart(id: string): Cart | undefined {
    return this.carts.get(id);
  }

  deleteCart(id: string): boolean {
    return this.carts.delete(id);
  }

  getAllCarts(): Cart[] {
    return Array.from(this.carts.values());
  }

  // Discounts
  setDiscount(code: string, discount: Discount): void {
    this.discounts.set(code.toLowerCase(), discount);
  }

  getDiscount(code: string): Discount | undefined {
    return this.discounts.get(code.toLowerCase());
  }

  incrementDiscountUsage(code: string): void {
    const discount = this.discounts.get(code.toLowerCase());
    if (discount) {
      discount.timesUsed++;
    }
  }

  // Orders
  setOrder(id: string, order: Order): void {
    this.orders.set(id, order);
  }

  getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  updateOrderStatus(id: string, status: Order['status']): boolean {
    const order = this.orders.get(id);
    if (!order) return false;
    order.status = status;
    order.updatedAt = new Date();
    return true;
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  // Payments
  setPayment(id: string, payment: Payment): void {
    this.payments.set(id, payment);
  }

  getPayment(id: string): Payment | undefined {
    return this.payments.get(id);
  }

  getPaymentByStripeId(stripePaymentIntentId: string): Payment | undefined {
    return Array.from(this.payments.values()).find(
      (p) => p.stripePaymentIntentId === stripePaymentIntentId
    );
  }

  updatePaymentStatus(
    id: string,
    status: Payment['status'],
    errorMessage?: string
  ): boolean {
    const payment = this.payments.get(id);
    if (!payment) return false;
    payment.status = status;
    payment.errorMessage = errorMessage;
    payment.updatedAt = new Date();
    return true;
  }

  // Inventory & Idempotency
  reserveInventoryAtomic(items: { productId: string; quantity: number }[]): boolean {
    // 1. Check all items first
    for (const item of items) {
      const product = this.products.get(item.productId);
      if (!product || product.inventory < item.quantity) {
        return false;
      }
    }

    // 2. Deduct all items
    for (const item of items) {
      const product = this.products.get(item.productId)!;
      product.inventory -= item.quantity;
      product.updatedAt = new Date();
    }

    return true;
  }

  restoreInventoryAtomic(items: { productId: string; quantity: number }[]): void {
    for (const item of items) {
      const product = this.products.get(item.productId);
      if (product) {
        product.inventory += item.quantity;
        product.updatedAt = new Date();
      }
    }
  }

  isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }
}

// Singleton store
export const store = new InMemoryStore();

// Seed initial products
function seedProducts(): void {
  const products: Product[] = [
    {
      id: 'prod_001',
      name: 'Wireless Headphones',
      description: 'Premium noise-canceling wireless headphones',
      price: 19999, // $199.99
      currency: 'usd',
      inventory: 50,
      imageUrl: 'https://example.com/headphones.jpg',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod_002',
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with Cherry MX switches',
      price: 14999, // $149.99
      currency: 'usd',
      inventory: 30,
      imageUrl: 'https://example.com/keyboard.jpg',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod_003',
      name: 'Gaming Mouse',
      description: 'High-precision gaming mouse with customizable buttons',
      price: 7999, // $79.99
      currency: 'usd',
      inventory: 100,
      imageUrl: 'https://example.com/mouse.jpg',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod_004',
      name: 'USB-C Hub',
      description: '7-in-1 USB-C hub with HDMI, USB-A, and SD card slots',
      price: 4999, // $49.99
      currency: 'usd',
      inventory: 75,
      imageUrl: 'https://example.com/hub.jpg',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  products.forEach((product) => {
    store.setProduct(product.id, product);
  });
}

// Seed initial discounts
function seedDiscounts(): void {
  const discounts: Discount[] = [
    {
      code: 'SAVE20',
      type: 'percentage',
      value: 20,
      minOrderAmount: 5000, // $50 minimum
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2027-12-31'),
      timesUsed: 0,
      active: true,
    },
    {
      code: 'FLAT10',
      type: 'fixed',
      value: 1000, // $10 off
      minOrderAmount: 3000, // $30 minimum
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2027-12-31'),
      timesUsed: 0,
      active: true,
    },
    {
      code: 'BOGOH',
      type: 'bogo',
      value: 100, // 100% off = free
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2027-12-31'),
      timesUsed: 0,
      active: true,
      bogoRule: {
        buyProductId: 'prod_001',
        getProductId: 'prod_004',
        buyQuantity: 1,
        getQuantity: 1,
        discountPercent: 100,
      },
    },
  ];

  discounts.forEach((discount) => {
    store.setDiscount(discount.code, discount);
  });
}

// Initialize seed data
export function initializeStore(): void {
  seedProducts();
  seedDiscounts();
}