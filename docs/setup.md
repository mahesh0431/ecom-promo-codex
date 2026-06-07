# Local Setup

This guide covers local setup, demo login, runtime modes, and validation commands.

## Requirements

- Node.js 20 or newer
- pnpm 10
- `OPENAI_API_KEY` for live Codex SDK runs, live image generation, and realtime voice

## One-Time Setup

If `pnpm` is not available yet, enable it once with Corepack:

```bash
corepack enable pnpm
```

Then run:

```bash
pnpm install
pnpm setup:demo
```

The setup command:

- creates `.env` and `.env.test` if they do not exist;
- creates the local `data/` folder;
- generates the Prisma client;
- runs the database migration;
- seeds the demo user and products;
- verifies the seed data.

For the live Codex SDK agent, image generation, and realtime voice, add one server-side OpenAI key to `.env`:

```text
OPENAI_API_KEY="..."
```

The backend uses this same key for Codex SDK runs, OpenAI image generation, and realtime voice session secrets. The browser UI should never ask for an API key.

The seed script defaults the local demo user to:

```text
Email: demo@promo.test
Password: demo-password
```

## Run The App

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Expected first-run flow:

1. Sign in with the seeded demo account.
2. Click `Generate Promotion Suggestions`.
3. Open `View recommendation` on a suggested product.
4. Click `Create campaign`.
5. Enter offer terms and click `Generate`.
6. Review saved campaign details and generated images.

For V1 voice control, start voice mode in the app after signing in and allow microphone access when your browser asks.

## Deterministic Local Mode

Use fake Codex and fake image generation when you want the workflow without live OpenAI calls:

```bash
CODEX_GATEWAY=fake IMAGE_GENERATION_MODE=fake pnpm dev
```

This is useful for UI checks and deterministic local development. The normal live path only needs `OPENAI_API_KEY`.

## Validation Commands

Run these before committing meaningful changes:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm test` uses `.env.test` and a separate SQLite database under `data/test.sqlite`.

If you need to rerun individual setup steps, they are still available:

```bash
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed
pnpm db:verify
```

## Codex App Skill

Codex App can use the checked-in repo skill at `.agents/skills/promo-campaign-studio`.

The skill does not require MCP setup. Follow the README setup, start the app yourself, then ask Codex to use the Promo Campaign Studio skill. The skill reads `.agents/skills/promo-campaign-studio/setup.md`, verifies `.env`, `OPENAI_API_KEY`, the running app, and seeded data, then logs into the local app API with the seeded demo account.

For this skill workflow, Codex App is the agent. It reads product API data, decides recommendations itself, and saves Codex App-authored campaign content through `POST /api/campaigns`. It should not call `/api/campaign-opportunities` or `/api/campaigns/generate`, because those routes start the app's backend Codex SDK agent for the in-app UI demo.

When the skill creates or regenerates campaign images, it should fetch returned `imageUrl` values with the saved login cookie and render the downloaded image inline in Codex App.

Do not use fake runtime modes for the skill demo. The skill should not start, stop, or restart the app server. If `.env`, `OPENAI_API_KEY`, the running API, or seeded data is missing, it should stop and ask the user to follow the README setup.

## Live Smoke Tests

Run these only when `OPENAI_API_KEY` is set:

```bash
RUN_CODEX_LIVE=1 pnpm codex:smoke
RUN_IMAGE_LIVE=1 pnpm image:smoke
RUN_LIVE_INTEGRATION=1 pnpm integration:live
```

The full live integration suite uses an isolated `data/live-integration.sqlite` database and writes a non-secret report under `output/live-integration/`.

## App-Owned Codex Runtime

Codex SDK runs are app-scoped. Runtime state, plugin/skill cache, and session JSONL stay under ignored `output/codex-runtime/home`, while Codex runs from ignored `output/codex-runtime/workspace`.

This keeps the demo from relying on a developer's personal `~/.codex` profile.
