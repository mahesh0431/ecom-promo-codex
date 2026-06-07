# ecom-promo-codex

Retail Promo Agent is a small eCommerce demo app where Codex helps a store team decide which products need a promotion and then creates a campaign from real product context.

The app is intentionally narrow. It is not a generic chatbot and it is not trying to become a commerce platform. It is one practical workflow: look at product data, explain the recommendation, create the campaign, and save the result.

## Why This Exists

Most promotion workflows start with a blank brief or a rushed guess. This demo starts with product and sales data. Codex reviews that context through a small read-only MCP layer, recommends products that need campaign attention, and helps generate the campaign once the user chooses the offer terms.

The point is to show Codex inside a real application workflow: authenticated UI, persisted data, scoped tools, generated campaign output, and generated images.

## Under The Hood

- A seeded demo login.
- SQLite persistence through Prisma.
- A read-only MCP layer for product and sales context.
- Codex SDK calls for promotion suggestions and campaign generation.
- OpenAI image generation for campaign variants.
- A simple Next.js UI built with Tailwind CSS and shadcn-style components.

## The Demo Flow

1. Sign in with the seeded demo account.
2. Open the products dashboard.
3. Click `Generate Promotion Suggestions`.
4. Open `View recommendation` on a suggested product.
5. Click `Create campaign` from the recommendation.
6. Set discount, quantity limit, and image variant count.
7. Click `Generate`.
8. Review the AI recommendation, caption, image prompt, and generated images.

## Run It Locally

Requirements:

- Node.js 20+
- pnpm 10+
- one `OPENAI_API_KEY` for live Codex and image generation

```bash
pnpm install && pnpm setup:demo
```

Add your OpenAI key to `.env`:

```text
OPENAI_API_KEY="..."
```

Start the app:

```bash
pnpm dev
```

Then open:

```text
http://localhost:3000
```

Demo login:

```text
Email: demo@promo.test
Password: demo-password
```

Live Codex and image generation use the single server-side `OPENAI_API_KEY` from `.env`. The app never asks for the key in the browser.

For deterministic fake mode, validation commands, and live smoke tests, see [Local Setup](docs/setup.md).

## Docs

- [Vision](VISION.md): product idea, core flow, and boundaries.
- [Architecture](ARCHITECTURE.md): technical shape and runtime boundaries.
- [Local Setup](docs/setup.md): install, environment, scripts, and validation.
- [Campaign Workflow](docs/campaign-workflow.md): product dashboard, recommendations, campaign creation, and campaign history.
- [Data Model](docs/data-model.md): SQLite/Prisma entities and persistence rules.
- [Auth](docs/auth.md): seeded demo auth and session behavior.
- [Codex MCP Contract](docs/codex-tools.md): how Codex gets safe product context.
- [Image Generation](docs/image-generation.md): OpenAI image generation flow and storage.
- [API Smoke Checks](docs/api-smoke.md): curl-based checks for backend routes.
- [Dashboard References](docs/dashboard/README.md): accepted UI reference images.
- [ExecPlan Guide](docs/PLANS.md): implementation planning format.

## Project Boundaries

This is a demo app, not a commerce platform. It deliberately avoids signup, payments, Shopify integration, complex RBAC, queues, scheduling, approval workflows, and generic chat UI.

## License

This project is open source under the [MIT License](LICENSE).
