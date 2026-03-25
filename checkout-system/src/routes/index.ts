import { Router } from 'express';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import checkoutRoutes from './checkout.routes.js';
import webhookRoutes from './webhook.routes.js';

const router = Router();

router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/webhooks', webhookRoutes);

export default router;