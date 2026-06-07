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

For the in-app UI path, this route asks the backend Codex SDK agent to write campaign content:

```bash
curl -s -b /tmp/ecom-promo-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"productId":"<productId>","discountPercent":15,"quantityLimit":50,"imageVariants":1,"optionalInstructions":"Keep it warm and premium."}' \
  http://localhost:3000/api/campaigns/generate
```

For the Codex App skill path, Codex App writes the recommendation, caption, and image prompt, then the app saves it and generates images:

```bash
curl -s -b /tmp/ecom-promo-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"productId":"<productId>","discountPercent":15,"quantityLimit":50,"imageVariants":1,"instagramCaption":"Caption written from product context.","imagePrompt":"Image prompt written from product context and offer terms.","reasoning":"Why this product and offer were selected."}' \
  http://localhost:3000/api/campaigns
```

Image metadata returned by campaign creation and image-generation routes includes a relative `imageUrl`. Codex App should fetch that URL with the saved cookie and render the downloaded image inline instead of only returning a localhost URL.

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
