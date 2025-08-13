# @zenobia/client

## Overview

The @zenobia/client package is a JavaScript SDK that provides the core client-side functionality for integrating Zenobia Pay into any website or application. This public npm package enables merchants to easily add "Pay with Zenobia" buttons and payment flows to their sites.

## Purpose

This package provides:
- Core payment SDK functionality
- QR code generation for payments
- Event handling and callbacks
- Cross-platform JavaScript support
- Framework-agnostic implementation

## Installation

```bash
npm install @zenobia/client
```

or

```bash
yarn add @zenobia/client
```

## Features

- **Payment Integration**: Simple API for payment initiation
- **QR Code Generation**: Built-in QR code creation for payment links
- **Event System**: Comprehensive event handling for payment lifecycle
- **Lightweight**: Minimal dependencies, optimized bundle size
- **TypeScript Support**: Full type definitions included
- **Cross-Browser**: Works in all modern browsers

## Basic Usage

### ES Modules

```javascript
import { ZenobiaClient } from '@zenobia/client'

// Initialize the client
const client = new ZenobiaClient({
  merchantId: 'your-merchant-id',
  environment: 'production' // or 'sandbox'
})

// Create a payment
const payment = await client.createPayment({
  amount: 100.00,
  orderId: 'order-123',
  description: 'Purchase from My Store'
})

// Generate QR code
const qrCode = await client.generateQRCode(payment.id)
```

### Script Tag

```html
<script src="https://zenobiapay.com/embed/latest/zenobia-pay.js"></script>
<script>
  const client = new ZenobiaPay.Client({
    merchantId: 'your-merchant-id'
  })
</script>
```

## API Reference

### ZenobiaClient

#### Constructor

```typescript
new ZenobiaClient(config: ClientConfig)
```

**Config Options:**
- `merchantId` (string, required): Your Zenobia merchant ID
- `environment` (string): 'production' or 'sandbox' (default: 'production')
- `apiUrl` (string): Custom API endpoint (optional)

#### Methods

##### createPayment

```typescript
createPayment(options: PaymentOptions): Promise<Payment>
```

Creates a new payment transfer.

**Options:**
- `amount` (number): Payment amount in dollars
- `orderId` (string): Your internal order ID
- `description` (string): Payment description
- `metadata` (object): Additional metadata (optional)

##### generateQRCode

```typescript
generateQRCode(paymentId: string, options?: QROptions): Promise<string>
```

Generates a QR code for a payment.

**Options:**
- `size` (number): QR code size in pixels (default: 256)
- `format` (string): 'svg' or 'png' (default: 'svg')
- `margin` (number): QR code margin (default: 4)

##### getPaymentStatus

```typescript
getPaymentStatus(paymentId: string): Promise<PaymentStatus>
```

Retrieves the current status of a payment.

##### cancelPayment

```typescript
cancelPayment(paymentId: string): Promise<void>
```

Cancels a pending payment.

### Event Handling

```javascript
client.on('payment.success', (data) => {
  console.log('Payment successful:', data)
})

client.on('payment.failed', (data) => {
  console.log('Payment failed:', data)
})

client.on('payment.cancelled', (data) => {
  console.log('Payment cancelled:', data)
})
```

**Available Events:**
- `payment.initiated`: Payment process started
- `payment.pending`: Waiting for user action
- `payment.success`: Payment completed successfully
- `payment.failed`: Payment failed
- `payment.cancelled`: Payment cancelled by user
- `error`: General error occurred

## QR Code Integration

### Basic QR Code

```javascript
import { generateQRCode } from '@zenobia/client'

const qrCodeDataUrl = await generateQRCode(paymentUrl, {
  size: 300,
  margin: 10
})

// Display in img tag
document.getElementById('qr-code').src = qrCodeDataUrl
```

### Advanced QR Options

```javascript
const qrCode = await client.generateQRCode(paymentId, {
  size: 400,
  format: 'svg',
  margin: 8,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  logo: 'https://yoursite.com/logo.png'
})
```

## Error Handling

```javascript
try {
  const payment = await client.createPayment({
    amount: 100.00,
    orderId: 'order-123'
  })
} catch (error) {
  if (error.code === 'INVALID_AMOUNT') {
    console.error('Invalid payment amount')
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('Network error, please retry')
  } else {
    console.error('Payment failed:', error.message)
  }
}
```

**Error Codes:**
- `INVALID_AMOUNT`: Payment amount is invalid
- `INVALID_MERCHANT`: Merchant ID not found
- `NETWORK_ERROR`: Network request failed
- `PAYMENT_NOT_FOUND`: Payment ID doesn't exist
- `UNAUTHORIZED`: Authentication failed

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { 
  ZenobiaClient, 
  PaymentOptions, 
  Payment, 
  PaymentStatus,
  ClientConfig 
} from '@zenobia/client'

const config: ClientConfig = {
  merchantId: 'merchant-123',
  environment: 'sandbox'
}

const client = new ZenobiaClient(config)

const options: PaymentOptions = {
  amount: 100.00,
  orderId: 'order-123',
  description: 'Test payment'
}

const payment: Payment = await client.createPayment(options)
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### Building

```bash
npm run build
```

This creates:
- `dist/index.js` - CommonJS build
- `dist/index.esm.js` - ES Modules build
- `dist/index.d.ts` - TypeScript definitions

### Testing

```bash
npm test
```

### Publishing

To publish a new version:

```bash
npx changeset
npm run release
```

The release script will:
1. Run `changeset version` to bump versions
2. Commit and push changes with tags
3. Build the package
4. Run `changeset publish` to publish to npm

## Configuration

### Environment Variables

For development:

```bash
VITE_API_URL=https://api.zenobiapay.com
VITE_SANDBOX_URL=https://sandbox.zenobiapay.com
```

### Build Configuration

The package uses Vite for building:

```javascript
// vite.config.js
export default {
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'ZenobiaClient',
      formats: ['es', 'cjs']
    }
  }
}
```

## Best Practices

### Security
- Never expose secret keys in client-side code
- Always validate payment amounts server-side
- Use HTTPS in production
- Implement webhook signature verification

### Performance
- Load SDK asynchronously when possible
- Cache QR codes for repeated use
- Use event delegation for multiple buttons
- Minimize SDK calls in loops

### Integration
```javascript
// Recommended initialization pattern
let client;

async function initializeZenobia() {
  if (!client) {
    client = new ZenobiaClient({
      merchantId: process.env.ZENOBIA_MERCHANT_ID,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
    })
  }
  return client
}

// Use throughout your app
const zenobia = await initializeZenobia()
```

## Migration Guide

### From Script Tag to NPM

Before:
```html
<script src="https://zenobiapay.com/zenobia-pay.js"></script>
<script>
  window.ZenobiaPay.init({ merchantId: '123' })
</script>
```

After:
```javascript
import { ZenobiaClient } from '@zenobia/client'
const client = new ZenobiaClient({ merchantId: '123' })
```

## Troubleshooting

### Common Issues

1. **Module not found**: Ensure package is installed correctly
2. **CORS errors**: Check API endpoint configuration
3. **QR code not generating**: Verify payment ID is valid
4. **Events not firing**: Check event listener syntax

### Debug Mode

```javascript
const client = new ZenobiaClient({
  merchantId: 'test-merchant',
  debug: true // Enables console logging
})
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- Documentation: [https://docs.zenobiapay.com](https://docs.zenobiapay.com)
- NPM Package: [https://www.npmjs.com/package/@zenobia/client](https://www.npmjs.com/package/@zenobia/client)
- Issues: [GitHub Issues](https://github.com/zenobia-pay/client/issues)
- Support: support@zenobiapay.com