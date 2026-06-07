# Local Setup

This guide covers local setup, demo login, runtime modes, and validation commands.

## Requirements

- Node.js 20 or newer
- pnpm 10 through Corepack
- `OPENAI_API_KEY` for live Codex SDK runs, live image generation, and realtime voice

## One-Time Setup

```bash
corepack enable pnpm
pnpm install
pnpm setup:demo
```

The setup command:

- creates `.env` and `.env.test` if they do not exist;
- creates the local `data/` folder;
- runs the database migration;
- seeds the demo user and products;
- verifies the seed data.

For live Codex and image generation, add one server-side OpenAI key to `.env`:

```text
OPENAI_API_KEY="..."
IMAGE_GENERATION_MODE="openai"
```

The backend uses this same key for Codex SDK runs, OpenAI image generation, and realtime voice session secrets. The browser UI should never ask for an API key.

Seeded login:

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

This is useful for UI checks and deterministic local development. The full live path should use `OPENAI_API_KEY` with `IMAGE_GENERATION_MODE="openai"`.

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
pnpm db:migrate
pnpm db:seed
pnpm db:verify
```

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
