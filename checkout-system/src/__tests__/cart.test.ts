import { describe, it, expect, beforeEach } from 'vitest';
import { cartService } from '../services/cart.service.js';
import { discountService } from '../services/discount.service.js';
import { store, initializeStore } from '../repositories/index.js';

describe('Cart Service', () => {
  beforeEach(() => {
    // Clear store and reinitialize
    store.getAllCarts().forEach(cart => store.deleteCart(cart.id));
    initializeStore();
  });

  describe('createCart', () => {
    it('should create a new cart with empty items', () => {
      const cart = cartService.createCart();

      expect(cart.id).toBeDefined();
      expect(cart.items).toEqual([]);
      expect(cart.subtotal).toBe(0);
      expect(cart.total).toBe(0);
      expect(cart.status).toBe('active');
    });
  });

  describe('addToCart', () => {
    it('should add an item to an empty cart', () => {
      const cart = cartService.createCart();
      const updatedCart = cartService.addToCart(cart.id, 'prod_001', 2);

      expect(updatedCart.items).toHaveLength(1);
      expect(updatedCart.items[0].productId).toBe('prod_001');
      expect(updatedCart.items[0].quantity).toBe(2);
      expect(updatedCart.subtotal).toBe(39998); // 19999 * 2
    });

    it('should increment quantity for existing item', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 2);
      const updatedCart = cartService.addToCart(cart.id, 'prod_001', 1);

      expect(updatedCart.items).toHaveLength(1);
      expect(updatedCart.items[0].quantity).toBe(3);
    });

    it('should throw error for non-existent product', () => {
      const cart = cartService.createCart();

      expect(() => cartService.addToCart(cart.id, 'invalid_id', 1)).toThrow('Product not found');
    });

    it('should throw error for insufficient inventory', () => {
      const cart = cartService.createCart();

      expect(() => cartService.addToCart(cart.id, 'prod_001', 1000)).toThrow('Only');
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 2);
      const updatedCart = cartService.removeFromCart(cart.id, 'prod_001');

      expect(updatedCart.items).toHaveLength(0);
      expect(updatedCart.subtotal).toBe(0);
    });

    it('should throw error for non-existent item', () => {
      const cart = cartService.createCart();

      expect(() => cartService.removeFromCart(cart.id, 'prod_001')).toThrow('Product not found in cart');
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 2);
      const updatedCart = cartService.updateQuantity(cart.id, 'prod_001', 5);

      expect(updatedCart.items[0].quantity).toBe(5);
      expect(updatedCart.subtotal).toBe(19999 * 5);
    });

    it('should remove item when quantity is 0', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 2);
      const updatedCart = cartService.updateQuantity(cart.id, 'prod_001', 0);

      expect(updatedCart.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 2);
      cartService.addToCart(cart.id, 'prod_002', 1);
      const clearedCart = cartService.clearCart(cart.id);

      expect(clearedCart.items).toHaveLength(0);
      expect(clearedCart.subtotal).toBe(0);
      expect(clearedCart.appliedDiscounts).toHaveLength(0);
    });
  });
});

describe('Discount Service', () => {
  beforeEach(() => {
    store.getAllCarts().forEach(cart => store.deleteCart(cart.id));
    initializeStore();
  });

  describe('applyDiscount', () => {
    it('should apply percentage discount', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 1); // $199.99

      const updatedCart = discountService.applyDiscount(cart.id, 'SAVE20');

      expect(updatedCart.appliedDiscounts).toHaveLength(1);
      expect(updatedCart.discountTotal).toBe(3999); // 20% of 19999 ≈ 3999 (floor)
      expect(updatedCart.total).toBe(16000); // 19999 - 3999
    });

    it('should apply fixed discount', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_002', 1); // $149.99

      const updatedCart = discountService.applyDiscount(cart.id, 'FLAT10');

      expect(updatedCart.appliedDiscounts).toHaveLength(1);
      expect(updatedCart.discountTotal).toBe(1000);
      expect(updatedCart.total).toBe(13999);
    });

    it('should throw error for invalid coupon', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 1);

      expect(() => discountService.applyDiscount(cart.id, 'INVALID')).toThrow('Invalid coupon code');
    });

    it('should throw error for minimum order not met', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_004', 1); // $49.99 < $50 minimum

      expect(() => discountService.applyDiscount(cart.id, 'SAVE20')).toThrow('Minimum order amount');
    });

    it('should throw error for already applied coupon', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 1);
      discountService.applyDiscount(cart.id, 'SAVE20');

      expect(() => discountService.applyDiscount(cart.id, 'SAVE20')).toThrow('already applied');
    });
  });

  describe('removeDiscount', () => {
    it('should remove applied discount', () => {
      const cart = cartService.createCart();
      cartService.addToCart(cart.id, 'prod_001', 1);
      discountService.applyDiscount(cart.id, 'SAVE20');
      const updatedCart = discountService.removeDiscount(cart.id, 'SAVE20');

      expect(updatedCart.appliedDiscounts).toHaveLength(0);
      expect(updatedCart.discountTotal).toBe(0);
      expect(updatedCart.total).toBe(19999);
    });
  });
});