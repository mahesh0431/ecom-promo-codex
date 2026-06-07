# API Smoke Checks

These curl commands are useful when debugging backend routes without using the UI.

Start the app first:

```bash
pnpm dev
```

## Health

```bash
curl -s http://localhost:3000/api/health
```

## Login And Session

```bash
curl -i -c /tmp/ecom-promo-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@promo.test","password":"demo-password"}' \
  http://localhost:3000/api/auth/login

curl -s -b /tmp/ecom-promo-cookies.txt \
  http://localhost:3000/api/auth/session
```

## Products

```bash
curl -s -b /tmp/ecom-promo-cookies.txt \
  http://localhost:3000/api/products/overview

curl -s -b /tmp/ecom-promo-cookies.txt \
  http://localhost:3000/api/products
```

## Promotion Suggestions

```bash
curl -s -b /tmp/ecom-promo-cookies.txt \
  -X POST http://localhost:3000/api/campaign-opportunities
```

## Campaign Generation

Replace `<productId>` with a product ID from `/api/products`.

```bash
curl -s -b /tmp/ecom-promo-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"productId":"<productId>","discountPercent":15,"quantityLimit":50,"imageVariants":1,"optionalInstructions":"Keep it warm and premium."}' \
  http://localhost:3000/api/campaigns/generate
```

## Campaign History

```bash
curl -s -b /tmp/ecom-promo-cookies.txt \
  "http://localhost:3000/api/campaigns?productId=<productId>"
```

## Campaign Detail

Replace `<campaignId>` with a campaign ID from campaign history or generation.

```bash
curl -s -b /tmp/ecom-promo-cookies.txt \
  "http://localhost:3000/api/campaigns/<campaignId>"
```
