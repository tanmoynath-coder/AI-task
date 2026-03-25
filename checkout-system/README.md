# Checkout System

A complete checkout system with payment processing (Stripe) and discount functionality.

## Features

- **Cart Management**: Create, update, and clear shopping carts
- **Product Catalog**: Browse and retrieve products
- **Discount System**: Support for percentage, fixed amount, and BOGO discounts
- **Payment Integration**: Stripe payment intent creation and webhook handling
- **Order Management**: Track order status and history

## API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details

### Cart
- `POST /api/cart` - Create new cart
- `GET /api/cart/:id` - Get cart details
- `POST /api/cart/:id/items` - Add item to cart
- `DELETE /api/cart/:id/items/:productId` - Remove item from cart
- `PATCH /api/cart/:id/items/:productId` - Update item quantity
- `POST /api/cart/:id/discount` - Apply discount code
- `DELETE /api/cart/:id/discount/:code` - Remove discount
- `DELETE /api/cart/:id` - Clear cart

### Checkout
- `POST /api/checkout/create-payment-intent` - Initialize Stripe payment
- `POST /api/checkout/confirm` - Confirm payment (testing)
- `GET /api/orders/:id` - Get order status

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## Test Data

The system is seeded with sample products and discount codes:

### Products
- `prod_001` - Wireless Headphones ($199.99)
- `prod_002` - Mechanical Keyboard ($149.99)
- `prod_003` - Gaming Mouse ($79.99)
- `prod_004` - USB-C Hub ($49.99)

### Discount Codes
- `SAVE20` - 20% off (min. $50 order)
- `FLAT10` - $10 off (min. $30 order)
- `BOGOH` - Buy headphones, get USB-C hub free

## Development

```bash
# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

```
src/
├── index.ts           # Application entry point
├── types/             # TypeScript interfaces
├── repositories/      # Data access layer (in-memory)
├── services/          # Business logic
│   ├── cart.service.ts
│   ├── discount.service.ts
│   ├── order.service.ts
│   └── payment.service.ts
├── routes/            # API routes
└── middleware/        # Express middleware
```

## License

MIT