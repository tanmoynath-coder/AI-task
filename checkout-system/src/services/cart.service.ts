import { v4 as uuidv4 } from 'uuid';
import { store } from '../repositories/index.js';
import { Cart, CartItem, ApiError } from '../types/index.js';

export class CartService {
  createCart(): Cart {
    const cart: Cart = {
      id: uuidv4(),
      items: [],
      subtotal: 0,
      appliedDiscounts: [],
      discountTotal: 0,
      total: 0,
      currency: 'usd',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.setCart(cart.id, cart);
    return cart;
  }

  getCart(cartId: string): Cart | null {
    const cart = store.getCart(cartId);
    if (!cart) {
      return null;
    }
    return cart;
  }

  addToCart(cartId: string, productId: string, quantity: number): Cart {
    const cart = store.getCart(cartId);
    if (!cart) {
      throw this.createError('CART_NOT_FOUND', 'Cart not found');
    }

    if (quantity <= 0) {
      throw this.createError('INVALID_QUANTITY', 'Quantity must be greater than 0');
    }

    const product = store.getProduct(productId);
    if (!product || !product.active) {
      throw this.createError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const existingItem = cart.items.find((item) => item.productId === productId);
    const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    if (newQuantity > product.inventory) {
      throw this.createError(
        'INSUFFICIENT_INVENTORY',
        `Only ${product.inventory} items available`,
        { available: product.inventory, requested: newQuantity }
      );
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
      existingItem.lineTotal = existingItem.quantity * existingItem.unitPrice;
    } else {
      const newItem: CartItem = {
        productId,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        lineTotal: quantity * product.price,
      };
      cart.items.push(newItem);
    }

    this.recalculateTotals(cart);
    cart.updatedAt = new Date();
    store.setCart(cartId, cart);
    return cart;
  }

  removeFromCart(cartId: string, productId: string): Cart {
    const cart = store.getCart(cartId);
    if (!cart) {
      throw this.createError('CART_NOT_FOUND', 'Cart not found');
    }

    const itemIndex = cart.items.findIndex((item) => item.productId === productId);
    if (itemIndex === -1) {
      throw this.createError('PRODUCT_NOT_FOUND', 'Product not found in cart');
    }

    cart.items.splice(itemIndex, 1);
    this.recalculateTotals(cart);
    cart.updatedAt = new Date();
    store.setCart(cartId, cart);
    return cart;
  }

  updateQuantity(cartId: string, productId: string, quantity: number): Cart {
    const cart = store.getCart(cartId);
    if (!cart) {
      throw this.createError('CART_NOT_FOUND', 'Cart not found');
    }

    if (quantity <= 0) {
      return this.removeFromCart(cartId, productId);
    }

    const product = store.getProduct(productId);
    if (!product || !product.active) {
      throw this.createError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const item = cart.items.find((item) => item.productId === productId);
    if (!item) {
      throw this.createError('PRODUCT_NOT_FOUND', 'Product not found in cart');
    }

    if (quantity > product.inventory) {
      throw this.createError(
        'INSUFFICIENT_INVENTORY',
        `Only ${product.inventory} items available`,
        { available: product.inventory, requested: quantity }
      );
    }

    item.quantity = quantity;
    item.lineTotal = quantity * item.unitPrice;
    this.recalculateTotals(cart);
    cart.updatedAt = new Date();
    store.setCart(cartId, cart);
    return cart;
  }

  clearCart(cartId: string): Cart {
    const cart = store.getCart(cartId);
    if (!cart) {
      throw this.createError('CART_NOT_FOUND', 'Cart not found');
    }

    cart.items = [];
    cart.appliedDiscounts = [];
    cart.discountTotal = 0;
    this.recalculateTotals(cart);
    cart.updatedAt = new Date();
    store.setCart(cartId, cart);
    return cart;
  }

  recalculateTotals(cart: Cart): void {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal, 0);

    // Recalculate discount total based on applied discounts
    // This is a placeholder - actual calculation happens in DiscountService
    const subtotalAfterDiscounts = cart.subtotal - cart.discountTotal;
    cart.total = Math.max(0, subtotalAfterDiscounts);
  }

  private createError(
    code: ApiError['code'],
    message: string,
    details?: Record<string, unknown>
  ): ApiError {
    return { code, message, details } as ApiError;
  }
}

export const cartService = new CartService();