import { store } from '../repositories/index.js';
import { Cart, Discount, AppliedDiscount, ApiError } from '../types/index.js';

export class DiscountService {
  validateCoupon(code: string, cart: Cart): { valid: boolean; error?: ApiError } {
    const discount = store.getDiscount(code);

    if (!discount) {
      return { valid: false, error: this.createError('COUPON_NOT_FOUND', 'Invalid coupon code') };
    }

    if (!discount.active) {
      return { valid: false, error: this.createError('COUPON_NOT_FOUND', 'Coupon is no longer active') };
    }

    const now = new Date();
    if (now < discount.validFrom) {
      return { valid: false, error: this.createError('COUPON_NOT_YET_VALID', 'Coupon is not yet valid') };
    }

    if (now > discount.validUntil) {
      return { valid: false, error: this.createError('COUPON_EXPIRED', 'Coupon has expired') };
    }

    if (discount.usageLimit !== undefined && discount.timesUsed >= discount.usageLimit) {
      return { valid: false, error: this.createError('COUPON_USAGE_LIMIT_REACHED', 'Coupon usage limit reached') };
    }

    if (discount.minOrderAmount !== undefined && cart.subtotal < discount.minOrderAmount) {
      return {
        valid: false,
        error: this.createError(
          'COUPON_MIN_ORDER_NOT_MET',
          `Minimum order amount is $${(discount.minOrderAmount / 100).toFixed(2)}`
        ),
      };
    }

    // Check if coupon is already applied
    const alreadyApplied = cart.appliedDiscounts.some((d) => d.code.toLowerCase() === code.toLowerCase());
    if (alreadyApplied) {
      return { valid: false, error: this.createError('COUPON_ALREADY_APPLIED', 'Coupon already applied') };
    }

    return { valid: true };
  }

  applyDiscount(cartId: string, code: string): Cart {
    const cart = store.getCart(cartId);
    if (!cart) {
      throw this.createError('CART_NOT_FOUND', 'Cart not found');
    }

    if (cart.items.length === 0) {
      throw this.createError('EMPTY_CART', 'Cannot apply discount to empty cart');
    }

    const validation = this.validateCoupon(code, cart);
    if (!validation.valid) {
      throw validation.error!;
    }

    const discount = store.getDiscount(code)!;
    const appliedDiscount = this.calculateDiscountAmount(cart, discount);

    cart.appliedDiscounts.push(appliedDiscount);
    cart.discountTotal += appliedDiscount.amount;
    cart.total = Math.max(0, cart.subtotal - cart.discountTotal);
    cart.updatedAt = new Date();

    // Increment usage count
    store.incrementDiscountUsage(code);

    store.setCart(cartId, cart);
    return cart;
  }

  removeDiscount(cartId: string, code: string): Cart {
    const cart = store.getCart(cartId);
    if (!cart) {
      throw this.createError('CART_NOT_FOUND', 'Cart not found');
    }

    const discountIndex = cart.appliedDiscounts.findIndex(
      (d) => d.code.toLowerCase() === code.toLowerCase()
    );

    if (discountIndex === -1) {
      throw this.createError('COUPON_NOT_FOUND', 'Coupon not applied to this cart');
    }

    const removedDiscount = cart.appliedDiscounts.splice(discountIndex, 1)[0];
    cart.discountTotal -= removedDiscount.amount;
    cart.total = Math.max(0, cart.subtotal - cart.discountTotal);
    cart.updatedAt = new Date();

    store.setCart(cartId, cart);
    return cart;
  }

  calculateDiscountAmount(cart: Cart, discount: Discount): AppliedDiscount {
    let amount = 0;
    let description = '';

    switch (discount.type) {
      case 'percentage':
        amount = this.calculatePercentageDiscount(cart, discount.value, discount.maxDiscountAmount);
        description = `${discount.value}% off`;
        break;

      case 'fixed':
        amount = this.calculateFixedDiscount(cart, discount.value);
        description = `$${(discount.value / 100).toFixed(2)} off`;
        break;

      case 'bogo':
        const bogoResult = this.calculateBOGODiscount(cart, discount);
        amount = bogoResult.amount;
        description = bogoResult.description;
        break;
    }

    // Ensure discount doesn't exceed subtotal
    amount = Math.min(amount, cart.subtotal);

    return {
      code: discount.code,
      type: discount.type,
      amount,
      description,
    };
  }

  private calculatePercentageDiscount(cart: Cart, percentage: number, maxAmount?: number): number {
    let amount = Math.floor((cart.subtotal * percentage) / 100);
    if (maxAmount !== undefined) {
      amount = Math.min(amount, maxAmount);
    }
    return amount;
  }

  private calculateFixedDiscount(cart: Cart, fixedAmount: number): number {
    return Math.min(fixedAmount, cart.subtotal);
  }

  private calculateBOGODiscount(cart: Cart, discount: Discount): { amount: number; description: string } {
    if (!discount.bogoRule) {
      return { amount: 0, description: 'Invalid BOGO configuration' };
    }

    const { buyProductId, getProductId, buyQuantity, getQuantity, discountPercent } = discount.bogoRule;

    // Check if customer has the required buy items
    const buyItem = cart.items.find((item) => item.productId === buyProductId);
    if (!buyItem || buyItem.quantity < buyQuantity) {
      return { amount: 0, description: 'BOGO: Buy item not in cart' };
    }

    // Check if customer has the get items
    const getItem = cart.items.find((item) => item.productId === getProductId);
    if (!getItem) {
      return { amount: 0, description: 'BOGO: Get item not in cart' };
    }

    // Calculate how many BOGO sets apply
    const qualifyingSets = Math.floor(buyItem.quantity / buyQuantity);
    const applicableGetItems = Math.min(qualifyingSets * getQuantity, getItem.quantity);

    const getProduct = store.getProduct(getProductId);
    if (!getProduct) {
      return { amount: 0, description: 'BOGO: Product not found' };
    }

    const discountAmount = Math.floor((getProduct.price * applicableGetItems * discountPercent) / 100);

    return {
      amount: discountAmount,
      description: `BOGO: ${discountPercent}% off ${applicableGetItems} item(s)`,
    };
  }

  private createError(code: ApiError['code'], message: string): ApiError {
    return { code, message };
  }
}

export const discountService = new DiscountService();