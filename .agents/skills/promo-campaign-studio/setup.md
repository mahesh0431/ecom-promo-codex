# eCommerce Promotion Cockpit API Setup

Use this setup note before operating the demo through app APIs.

This is a demo skill for a local app. It requires the user to run the project from the README first. The skill validates setup and then uses app APIs; it does not run setup, start the server, or fall back to fake modes.

If any required check fails, stop and ask the user to follow the README local setup, add `OPENAI_API_KEY` to `.env`, start the app with `pnpm dev`, and retry.

## Required Project Setup

Run these checks from the repo root. They are validation only.

Check `.env` exists:

```bash
test -f .env
```

If `.env` is missing, stop and ask the user to run:

```bash
pnpm setup:demo
```

Check `OPENAI_API_KEY` is present in `.env`:

```bash
grep -Eq '^OPENAI_API_KEY=(".*[^"]"|.+)$' .env
```

If `OPENAI_API_KEY` is missing or blank, stop and ask the user to add it to `.env`:

```text
OPENAI_API_KEY="..."
```

## Validate The App

The local app should be running at:

```text
http://localhost:3000
```

Check health:

```bash
curl -s http://localhost:3000/api/health
```

If the app API is not reachable, stop. Say this local demo skill needs the eCommerce Promotion Cockpit dev server already running at `http://localhost:3000`, and ask the user to follow the README setup before retrying.

## Login

Use the seeded demo login:

```text
demo@promo.test / demo-password
```

For shell API calls, keep cookies in a temp cookie jar:

```bash
COOKIE_JAR=/tmp/ecom-promo-codex.cookies
curl -s -c "$COOKIE_JAR" \
  -H "content-type: application/json" \
  -d '{"email":"demo@promo.test","password":"demo-password"}' \
  http://localhost:3000/api/auth/login
```

Use `-b "$COOKIE_JAR"` on subsequent calls.

If login fails, stop and ask the user to follow the README local setup and make sure the seeded demo user is available.

Validate seeded data before recommending anything:

```bash
curl -s -b "$COOKIE_JAR" http://localhost:3000/api/products/overview
curl -s -b "$COOKIE_JAR" http://localhost:3000/api/products
```

If products are missing or the API returns an auth/setup error, stop and ask the user to follow the README local setup and make sure seeded data is available.

## API Contract

Read context:

```text
GET /api/products/overview
GET /api/products
GET /api/products/{productId}/campaign-context
GET /api/campaigns?productId={productId}
GET /api/campaigns/{campaignId}
```

For recommendations, use the product API data and decide in Codex App. Do not call:

```text
POST /api/campaign-opportunities
```

That endpoint runs the app's backend Codex SDK agent and is only for the in-app UI demo.

Create a saved campaign from Codex App-authored content:

```text
POST /api/campaigns
```

Body:

```json
{
  "productId": "product-id-from-api",
  "discountPercent": 15,
  "quantityLimit": 50,
  "imageVariants": 1,
  "instagramCaption": "Caption written by Codex App from the product context.",
  "imagePrompt": "Image prompt written by Codex App from the product context and offer terms.",
  "reasoning": "Why Codex App chose this product and offer.",
  "optionalInstructions": "Optional creative or campaign direction"
}
```

Do not call `POST /api/campaigns/generate` from this skill. That endpoint runs the app's backend Codex SDK campaign generator.

Request limits:

- `discountPercent`: integer from 1 to 100.
- `quantityLimit`: positive integer and must not exceed product stock.
- `imageVariants`: 1 or 2.
- `instagramCaption`: max 2200 characters.
- `imagePrompt`: max 4000 characters.
- `reasoning`: max 2000 characters.

Generate additional saved images:

```text
POST /api/campaigns/{campaignId}/images/generate
```

Body:

```json
{
  "variants": 1,
  "customInstructions": "Optional image direction"
}
```

For additional images, `variants` should be 1 or 2 and `customInstructions` must be 500 characters or fewer. If the user gives a rich visual direction, compress it below 500 characters before calling the API.

Use IDs returned by the API. Do not invent product IDs or campaign IDs.

## Display Generated Images

Campaign and image-generation responses include `imageUrl` on each image. Use the returned `imageUrl` exactly; do not reconstruct the image route from IDs unless the response is missing `imageUrl`.

```text
/api/campaigns/{campaignId}/images/{imageId}
```

After creating a campaign or generating another image, fetch each image through the app with the saved auth cookie:

```bash
curl -s -b "$COOKIE_JAR" \
  -o outputs/campaign-image.jpg \
  "http://localhost:3000{imageUrl-from-response}"
```

Prefer the current Codex thread's `outputs/` directory when available. In the final response, embed the saved file with Markdown image syntax:

```markdown
![Campaign creative](/absolute/path/to/outputs/campaign-image.jpg)
```

Do not only return the localhost image URL; the user should see the generated image inline.
