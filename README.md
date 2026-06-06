# ecom-promo-codex

An open-source demo app for an eCommerce promotion workflow powered by Codex.

See [VISION.md](VISION.md) for the current product direction.

## Backend Setup

This repo currently exposes backend-first Next.js route handlers, Prisma/SQLite persistence, seeded demo data, and seeded-only auth.

```bash
pnpm install
test -f .env || cp .env.example .env
test -f .env.test || cp .env.test.example .env.test
mkdir -p data
pnpm db:migrate -- --name init
pnpm prisma:generate
pnpm db:seed
pnpm db:verify
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run the local backend:

```bash
pnpm dev
```

Run deterministic campaign APIs without live Codex:

```bash
CODEX_GATEWAY=fake pnpm dev
```

Run the real Codex SDK/MCP smoke when local Codex auth is available:

```bash
RUN_CODEX_LIVE=1 pnpm codex:smoke
```

Useful local checks:

```bash
curl -s http://localhost:3000/api/health
curl -i http://localhost:3000/api/products/overview
curl -i -c /tmp/ecom-promo-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@promo.test","password":"demo-password"}' \
  http://localhost:3000/api/auth/login
curl -s -b /tmp/ecom-promo-cookies.txt http://localhost:3000/api/auth/session
curl -s -b /tmp/ecom-promo-cookies.txt http://localhost:3000/api/products/overview
curl -s -b /tmp/ecom-promo-cookies.txt http://localhost:3000/api/products
curl -s -b /tmp/ecom-promo-cookies.txt \
  -X POST http://localhost:3000/api/campaign-opportunities
curl -s -b /tmp/ecom-promo-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"productId":"<productId>","optionalInstructions":"Keep it warm and premium."}' \
  http://localhost:3000/api/campaigns/generate
curl -s -b /tmp/ecom-promo-cookies.txt http://localhost:3000/api/campaigns
```

## Demo Login

Use the seeded demo account when running locally:

```text
Email: demo@promo.test
Password: demo-password
```

## Docs

- [Vision](VISION.md)
- [Architecture](ARCHITECTURE.md)
- [Auth](docs/auth.md)
- [Campaign workflow](docs/campaign-workflow.md)
- [Data model](docs/data-model.md)
- [Codex MCP contract](docs/codex-tools.md)
- [Image generation](docs/image-generation.md)
- [ExecPlan guide](docs/PLANS.md)

## License

This project is open source under the [MIT License](LICENSE).
