// User Types
export { User, SafeUser } from './user.types.js';
export { RegisterRequest, LoginRequest, AuthResponse, JwtPayload, AuthenticatedRequest } from './auth.types.js';

// Product Model
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  currency: string;
  inventory: number;
  imageUrl?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Cart Item
export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // in cents
  lineTotal: number; // in cents
}

// Discount Types
export type DiscountType = 'percentage' | 'fixed' | 'bogo';

export interface BOGORule {
  buyProductId: string;
  getProductId: string;
  buyQuantity: number;
  getQuantity: number;
  discountPercent: number; // e.g., 100 for free, 50 for half price
}

export interface Discount {
  code: string;
  type: DiscountType;
  value: number; // percentage (e.g., 20 for 20%) or fixed amount in cents
  minOrderAmount?: number; // minimum subtotal in cents
  maxDiscountAmount?: number; // cap in cents
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  timesUsed: number;
  active: boolean;
  bogoRule?: BOGORule; // only for BOGO type
}

export interface AppliedDiscount {
  code: string;
  type: DiscountType;
  amount: number; // actual discount applied in cents
  description: string;
}

// Cart Status
export type CartStatus = 'active' | 'abandoned' | 'converted';

// Cart
export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number; // in cents
  appliedDiscounts: AppliedDiscount[];
  discountTotal: number; // in cents
  total: number; // in cents
  currency: string;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Order Status
export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'refunded';

// Order
export interface Order {
  id: string;
  cartId: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Status
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

// Payment
export interface Payment {
  id: string;
  orderId: string;
  amount: number; // in cents
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  stripePaymentIntentId: string;
  clientSecret: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateQuantityRequest {
  quantity: number;
}

export interface ApplyDiscountRequest {
  code: string;
}

export interface CreatePaymentIntentRequest {
  cartId: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

// Error Types
export type ErrorCode =
  | 'CART_NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'INSUFFICIENT_INVENTORY'
  | 'INVALID_QUANTITY'
  | 'COUPON_NOT_FOUND'
  | 'COUPON_EXPIRED'
  | 'COUPON_NOT_YET_VALID'
  | 'COUPON_USAGE_LIMIT_REACHED'
  | 'COUPON_MIN_ORDER_NOT_MET'
  | 'COUPON_ALREADY_APPLIED'
  | 'INVALID_COUPON_FORMAT'
  | 'EMPTY_CART'
  | 'PAYMENT_FAILED'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'USER_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_INPUT';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}