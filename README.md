# ecom-promo-codex

Promo Campaign Studio is a small eCommerce demo app where a Codex SDK-powered agent helps a store team decide which products need a promotion and then creates a campaign from real product context.

The app is intentionally narrow. It is not a generic chatbot and it is not trying to become a commerce platform. It is one practical workflow: look at product data, explain the recommendation, create the campaign, and save the result.

## Why This Exists

Most promotion workflows start with a blank brief or a rushed guess. This demo starts with product and sales data. A Codex SDK-powered agent inspects that context through a small read-only MCP layer, recommends products that need campaign attention, and helps generate the campaign once the user chooses the offer terms.

The point is to show the Codex SDK used as an agent inside a real application workflow: authenticated UI, persisted data, scoped tools, generated campaign output, and campaign creative.

## Under The Hood

- A seeded demo login.
- SQLite persistence through Prisma.
- A read-only MCP layer for product and sales context.
- A Codex SDK agent for promotion suggestions and campaign generation.
- OpenAI image generation for campaign variants.
- Optional realtime voice control for the same UI workflow.
- A simple Next.js UI built with Tailwind CSS and shadcn-style components.

## The Demo Flow

1. Sign in with the seeded demo account.
2. Open the products dashboard.
3. Click `Generate Promotion Suggestions`.
4. Open `View recommendation` on a suggested product.
5. Click `Create campaign` from the recommendation.
6. Review or adjust discount, quantity limit, and image variant count.
7. Click `Generate`.
8. Review the caption, image prompt, and campaign creative.

V1 also lets a signed-in user start voice control and speak through the same workflow.

## Run It Locally

Requirements:

- Node.js 20+
- pnpm 10 through Corepack
- one `OPENAI_API_KEY` for the Codex SDK agent, image generation, and realtime voice

```bash
corepack enable pnpm
pnpm install
pnpm setup:demo
```

`pnpm setup:demo` creates `.env`, runs migrations, seeds the demo user/products, and verifies the seed data.

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

The seeded demo login is:

```text
Email: demo@promo.test
Password: demo-password
```

The Codex SDK agent, image generation, and realtime voice use the single server-side `OPENAI_API_KEY` from `.env`. The app never asks for the key in the browser. For voice, the browser receives only a short-lived realtime client secret.

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
- [Realtime Voice Control](docs/realtime-voice.md): browser voice control for the same promo workflow.
- [API Smoke Checks](docs/api-smoke.md): curl-based checks for backend routes.
- [Dashboard References](docs/dashboard/README.md): accepted UI reference images.
- [ExecPlan Guide](docs/PLANS.md): implementation planning format.

## Project Boundaries

This is a demo app, not a commerce platform. It deliberately avoids signup, payments, Shopify integration, complex RBAC, queues, scheduling, approval workflows, and generic chat UI.

Dashboard sorting is client-side over the seeded demo dataset. V0 intentionally does not include server-side sorting, filtering, or pagination.

## License

This project is open source under the [MIT License](LICENSE).
