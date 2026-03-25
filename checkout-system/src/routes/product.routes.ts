import { Router, Request, Response } from 'express';
import { store } from '../repositories/index.js';
import { asyncHandler } from '../middleware/index.js';

const router = Router();

// GET /api/products - List all products
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const products = store.getAllProducts();

    res.json({
      success: true,
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        inventory: p.inventory,
        imageUrl: p.imageUrl,
      })),
    });
  })
);

// GET /api/products/:id - Get product by ID
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = store.getProduct(id);

    if (!product || !product.active) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        inventory: product.inventory,
        imageUrl: product.imageUrl,
      },
    });
  })
);

export default router;