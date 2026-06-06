# Live Integration Suite

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `docs/PLANS.md`.

## Purpose / Big Picture

After this change, the repo has one live integration command that proves the current backend workflow works as a whole system:

1. local SQLite persistence;
2. seeded app authentication;
3. protected product APIs;
4. live Codex SDK campaign opportunity discovery through the backend route;
5. live Codex SDK campaign generation through the backend path;
6. live OpenAI image generation from the saved campaign `imagePrompt`;
7. raw persisted image byte serving.

This plan intentionally does not build UI tests, browser automation, CI automation, mock-only tests, object storage, queues, scheduling, payment, Shopify, or concurrency hardening. The output is a live proof script and a lightweight artifact report that can be run before an interview demo.

## Progress

- [x] (2026-06-06 12:39Z) [M0] Initial live integration suite ExecPlan drafted.
- [x] (2026-06-06 12:42Z) [M0] Exact draft sub-agent validation completed; blockers found and useful feedback folded in.
- [x] (2026-06-06 12:45Z) [M0] Updated exact draft sub-agent validation completed; final DB override blocker found and folded in.
- [x] (2026-06-06 12:46Z) [M0] Final exact draft sub-agent validation completed and approved for implementation.
- [ ] (YYYY-MM-DD HH:MMZ) [M1] Isolated live integration database and app-server runner implemented.
- [ ] (YYYY-MM-DD HH:MMZ) [M2] End-to-end HTTP workflow implemented.
- [ ] (YYYY-MM-DD HH:MMZ) [M3] Artifact report, README notes, and generated-output ignore rules implemented.
- [ ] (YYYY-MM-DD HH:MMZ) [M4] Full validation, live run evidence, and retrospective completed.

## Surprises & Discoveries

- Observation: Plan 3 live image smoke currently leaves real smoke campaign/image rows in `data/dev.sqlite`.
  Evidence: After Plan 3 validation, `pnpm db:verify` showed 1 campaign and 4 campaign images in the local dev database.
- Observation: Existing smoke commands prove individual live pieces, but not the full HTTP workflow as a single app.
  Evidence: `scripts/codex-smoke.ts` calls the Codex gateway directly, while `scripts/image-smoke.ts` calls the image service directly. Neither logs in through the app, exercises HTTP cookies, or fetches raw image bytes through the route.
- Observation: Exact-draft sub-agent validation found the first draft was not implementation-ready.
  Evidence: Review on 2026-06-06 flagged missing server command, vague logout/session expectation, default-DB mutation risk from focused smoke scripts, MCP evidence overclaiming, missing JSON wrapper contract, and missing live-step timeout guidance.
- Observation: Updated-draft sub-agent validation found one remaining blocker: unsafe DB override behavior.
  Evidence: Review on 2026-06-06 flagged that `LIVE_INTEGRATION_DATABASE_URL="file:../data/dev.sqlite"` would let an implementation reset the dev DB while still following the plan.
- Observation: Final exact-draft validation approved the plan with only low residual risks.
  Evidence: Review on 2026-06-06 confirmed prior blockers were addressed. Remaining low risks are cold `next dev` startup taking longer than 60000ms and the image byte assertion assuming JPEG remains the configured output.

## Decision Log

- Decision: Create one guarded live integration command instead of adding live checks to `pnpm test`.
  Rationale: Live Codex and image calls require credentials, network access, model/account availability, and time. They should be explicit, not part of normal deterministic tests.
  Date/Author: 2026-06-06 / Codex
- Decision: Run the live suite against an isolated SQLite database.
  Rationale: The suite should be repeatable without polluting `data/dev.sqlite` or depending on old smoke rows.
  Date/Author: 2026-06-06 / Codex
- Decision: Exercise the app through HTTP route handlers by starting a real Next.js server.
  Rationale: This proves auth cookies, protected routes, request parsing, route response shapes, persistence, Codex integration, image generation, and raw byte serving together.
  Date/Author: 2026-06-06 / Codex
- Decision: Keep existing `codex:smoke` and `image:smoke` as focused lower-level diagnostics.
  Rationale: The new suite should orchestrate the user-visible backend flow. If it fails, the focused smoke scripts remain useful for narrowing Codex-vs-image-vs-HTTP failures.
  Date/Author: 2026-06-06 / Codex
- Decision: The live HTTP suite proves backend route integration with live Codex output, but does not claim MCP tool-call telemetry.
  Rationale: MCP tool-call evidence is currently captured only by `scripts/codex-smoke.ts`, not by HTTP route responses.
  Date/Author: 2026-06-06 / Codex, after sub-agent review
- Decision: Hard-reject unsafe live integration database paths before deleting or resetting any SQLite file.
  Rationale: A guarded live suite must not have a hidden path that can wipe `data/dev.sqlite`, `data/test.sqlite`, or the app's configured database.
  Date/Author: 2026-06-06 / Codex, after sub-agent review

## Outcomes & Retrospective

Not started. Update after implementation and validation.

## Context and Orientation

The repo currently has:

- Next.js API routes under `src/app/api`;
- seeded-only auth with `demo@promo.test / demo-password`;
- SQLite through Prisma;
- product overview/list/context APIs;
- Codex SDK-backed opportunity and campaign generation;
- a small read-only `promo-campaign-mcp` server used by Codex;
- OpenAI image generation and `CampaignImage` persistence;
- raw campaign image serving route.

Existing validation commands:

- `pnpm test` covers deterministic unit/route/service behavior with fake Codex/image gateways.
- `RUN_CODEX_LIVE=1 pnpm codex:smoke` proves live Codex SDK and MCP tool-call evidence directly.
- `RUN_IMAGE_LIVE=1 pnpm image:smoke` proves live OpenAI image generation and `CampaignImage` persistence directly.

This plan adds a black-box app-level live suite. "Black-box" means the test talks to the app over HTTP like a client, instead of importing service functions for the main workflow.

The live HTTP suite should not claim direct MCP tool-call evidence unless the backend later exposes that telemetry. It can assert the route is running with `CODEX_GATEWAY="sdk"` and that live Codex-generated outputs are returned and persisted.

## Milestones

Milestone 1: Isolated Database and App Server Runner

At the end of this milestone, a guarded script can prepare an isolated live integration database, seed it, start a Next.js server on a test port, wait for `/api/health`, and shut the server down cleanly.

Implementation details:

- Add `scripts/live-integration.ts`.
- Add package script:

      "integration:live": "tsx scripts/live-integration.ts"

- The script must skip unless explicitly enabled:

      RUN_LIVE_INTEGRATION=1 pnpm integration:live

- Use an isolated database by default:

      DATABASE_URL="file:../data/live-integration.sqlite"

- Allow override only through a clearly named env var:

      LIVE_INTEGRATION_DATABASE_URL="file:../data/custom-live-integration.sqlite"

- Before deleting or resetting any database, resolve the selected live DB URL to an absolute file path and enforce all of these guards:
  - only `file:` SQLite URLs are allowed;
  - basename must match `live-integration*.sqlite`;
  - path must not equal `data/dev.sqlite`;
  - path must not equal `data/test.sqlite`;
  - path must not equal the `.env` or process `DATABASE_URL` target if that target is not itself a guarded `live-integration*.sqlite` path;
  - reject any path outside the repo `data/` directory unless a future plan explicitly adds that escape hatch.
- If the guard fails, exit before deleting files or running Prisma.

- Before starting the server:
  - remove the isolated SQLite file plus `-journal`, `-wal`, and `-shm` siblings;
  - run Prisma schema setup against that database using the same child-process env pattern as `tests/setup/global-setup.ts`;
  - run `prisma/seed.ts` against that database using the same child-process env;
  - verify seed counts.
- Start the app server with:
  - `DATABASE_URL` set to the isolated DB;
  - `CODEX_GATEWAY="sdk"`;
  - `IMAGE_GENERATION_MODE="openai"`;
  - existing `OPENAI_API_KEY`;
  - `CODEX_SANDBOX_MODE` defaulting to `read-only`;
  - a test port from `LIVE_INTEGRATION_PORT` or a safe default such as `3210`.
- Use this exact app-server command:

      pnpm exec next dev --hostname 127.0.0.1 --port <port>

- Wait for `GET /api/health` to return 200 before starting assertions.
- Always terminate the server in a `finally` block.
- Add server startup and per-step timeouts:
  - `LIVE_INTEGRATION_SERVER_TIMEOUT_MS`, default `60000`;
  - `LIVE_INTEGRATION_STEP_TIMEOUT_MS`, default `180000`;
  - each Codex/image HTTP step must fail with the step name if it exceeds the timeout.

Validation for this milestone:

      cd /Users/mahesh/Projects/ecom-promo-codex
      RUN_LIVE_INTEGRATION=1 LIVE_INTEGRATION_SKIP_FLOW=1 pnpm integration:live

Expected result: the script starts the server, observes health, prints a minimal summary, shuts down, and leaves no process listening on the test port.

Milestone 2: End-to-End HTTP Workflow

At the end of this milestone, the script exercises the whole current backend workflow through HTTP.

HTTP flow:

All JSON assertions must follow the app response wrapper:

- successful JSON responses are `{ data: ... }`;
- error JSON responses are `{ error: { code, message } }`.

1. `GET /api/health`
   - expect 200.
2. `GET /api/products/overview` without cookies
   - expect 401 to prove route protection.
3. `POST /api/auth/login`
   - send seeded credentials;
   - capture the session cookie.
4. `GET /api/auth/session`
   - expect authenticated demo user.
5. `GET /api/products/overview`
   - expect total products, available stock, and current-month sales metrics.
6. `GET /api/products`
   - expect 10 seeded products.
7. `POST /api/campaign-opportunities`
   - live Codex SDK should inspect MCP-backed product/sales context;
   - expect at least one opportunity;
   - assert returned product IDs exist in the seeded product list.
8. `POST /api/campaigns/generate`
   - use the first opportunity product;
   - pass a short optional instruction such as "Keep this concise for a live integration smoke.";
   - expect status 201 with `{ data: { campaign } }`;
   - expect persisted campaign with `instagramCaption`, `imagePrompt`, and `codexReasoning`.
9. `GET /api/campaigns`
   - expect the generated campaign in recent campaigns.
10. `GET /api/campaigns/[campaignId]`
    - expect campaign detail matches generated campaign.
11. `POST /api/campaigns/[campaignId]/images/generate`
    - request one variant;
    - expect status 201 with `{ data: { images } }`;
    - expect image metadata only.
12. `GET /api/campaigns/[campaignId]/images`
    - expect generated image metadata.
13. `GET /api/campaigns/[campaignId]/images/[imageId]`
    - expect `Content-Type: image/jpeg`;
    - expect non-empty bytes;
    - expect JPEG signature bytes.
14. `POST /api/auth/logout`
    - expect logout success.
15. `GET /api/auth/session`
    - expect status 401 with `{ error: { code: "UNAUTHORIZED" } }`.

The script should use a tiny local cookie jar helper, not a browser dependency. It should never log the session token or `OPENAI_API_KEY`.

Validation for this milestone:

      cd /Users/mahesh/Projects/ecom-promo-codex
      RUN_LIVE_INTEGRATION=1 pnpm integration:live

Expected result: the command completes successfully and prints a concise summary containing product count, selected product SKU, campaign ID, image ID, image byte length, and artifact path.

Milestone 3: Artifact Report and Docs

At the end of this milestone, each live integration run writes a small JSON report that can be shared or inspected without leaking secrets.

Implementation details:

- Write reports under:

      output/live-integration/

- Add `output/` to `.gitignore` so generated images/reports are not accidentally committed.
- Report fields should include:
  - timestamp;
  - app base URL;
  - database URL basename only, not full secret-bearing values;
  - Codex gateway mode;
  - image generation mode;
  - health status;
  - product count;
  - opportunity count;
  - selected product SKU;
  - campaign ID;
  - image ID;
  - image MIME type;
  - image byte length;
  - final database counts;
  - total duration in milliseconds.
- Do not include:
  - API keys;
  - session cookies;
  - full generated captions if they are noisy;
  - raw image bytes;
  - base64 images.
- Update README with one short live integration command section.
- Mention that `codex:smoke` and `image:smoke` remain lower-level diagnostics.

Validation for this milestone:

      cd /Users/mahesh/Projects/ecom-promo-codex
      RUN_LIVE_INTEGRATION=1 pnpm integration:live
      ls output/live-integration

Expected result: a JSON artifact exists and contains only non-secret metadata.

Milestone 4: Full Validation and Resumability

At the end of this milestone, deterministic checks and live checks have been run and this ExecPlan contains the evidence.

Required commands:

      cd /Users/mahesh/Projects/ecom-promo-codex
      pnpm db:verify
      pnpm typecheck
      pnpm lint
      pnpm test
      pnpm build
      RUN_LIVE_INTEGRATION=1 pnpm integration:live

Optional diagnostics if the full live suite fails:

      RUN_CODEX_LIVE=1 pnpm codex:smoke
      DATABASE_URL="file:../data/live-integration-diagnostics.sqlite" RUN_IMAGE_LIVE=1 pnpm image:smoke

Expected result:

- deterministic checks pass;
- live integration suite passes;
- `data/dev.sqlite` is not mutated by the integration suite;
- generated reports/images remain under ignored `output/`;
- no OpenAI key or session token appears in logs or artifacts.

## Plan of Work

Create `scripts/live-integration.ts` as a small Node/TypeScript runner. Keep the runner self-contained with tiny helpers for child-process execution, server startup, readiness polling, HTTP requests, cookie handling, assertions, artifact writing, and cleanup.

Do not add Playwright, browser automation, Jest/Vitest live tests, or a new test framework. This suite is a script because it depends on live credentials and external services.

Do not modify app routes merely to make the integration script easier. The point is to validate the real route surface. Only fix app code if the live suite reveals a genuine route bug.

Keep the existing focused smoke scripts as manual diagnostics, but do not make the live integration suite run them by default. The live suite should perform one complete HTTP workflow to control cost and runtime. If `image:smoke` is used while debugging, run it with an isolated `DATABASE_URL` so it does not add rows to `data/dev.sqlite`.

## Concrete Steps

1. Confirm the current implementation is already green:

      cd /Users/mahesh/Projects/ecom-promo-codex
      pnpm typecheck
      pnpm lint
      pnpm test
      pnpm build

2. Add `scripts/live-integration.ts`.

3. Add `integration:live` to `package.json`.

4. Add `output/` to `.gitignore`.

5. Implement isolated DB setup:

      DATABASE_URL="file:../data/live-integration.sqlite"
      pnpm prisma db push --force-reset
      pnpm tsx prisma/seed.ts

6. Implement the live DB path guard before any file deletion or Prisma reset.

7. Implement app server start/wait/stop with:

      pnpm exec next dev --hostname 127.0.0.1 --port <port>

8. Implement the HTTP workflow and assertions.

9. Implement artifact report writing under `output/live-integration/`.

10. Update README with the live integration command.

11. Run all validation commands and update this ExecPlan with evidence.

## Validation and Acceptance

This plan is accepted when all of the following are true:

- `RUN_LIVE_INTEGRATION=1 pnpm integration:live` starts a real app server and completes the whole backend workflow over HTTP.
- The suite uses live Codex SDK through backend routes, not `CODEX_GATEWAY=fake`.
- The suite uses live OpenAI image generation through backend routes, not `IMAGE_GENERATION_MODE=fake`.
- The suite uses an isolated SQLite database by default.
- The suite rejects unsafe database overrides before deleting files or running Prisma.
- The suite verifies auth, product APIs, opportunity generation, campaign generation, image generation, image listing, raw image byte serving, persistence counts, and logout.
- The suite writes a non-secret JSON report.
- The suite shuts down the app server on success and failure.
- Normal `pnpm test` remains deterministic and network-free.
- No UI or browser test dependency is added.

## Idempotence and Recovery

The live suite should be safe to rerun. It resets only the isolated live integration SQLite database, never `data/dev.sqlite`.

Database path validation must happen before sidecar deletion, `prisma db push --force-reset`, or seeding. If a user passes an unsafe `LIVE_INTEGRATION_DATABASE_URL`, the script should fail with a message explaining the accepted `live-integration*.sqlite` naming rule.

If the server port is already in use, the script should fail with a clear message and suggest setting `LIVE_INTEGRATION_PORT`.

If Codex auth, MCP startup, OpenAI image access, or model/account access fails, the script should fail clearly and write a partial artifact with the failed step name. It should not print secrets.

If the script is interrupted, the `finally` block should stop the child server process. If a stale process remains, the final answer or docs should include the exact port and PID inspection command used during debugging.

## Artifacts and Notes

The suite should write reports like:

      output/live-integration/2026-06-06T12-39-00Z.json

The artifact is for local proof and debugging only. It should not be committed by default.

The current known live validation state before this plan:

- `RUN_CODEX_LIVE=1 pnpm codex:smoke` has passed in earlier Plan 2 validation.
- `RUN_IMAGE_LIVE=1 pnpm image:smoke` has passed in Plan 3 validation.
- Plan 3 live image smoke left 1 campaign and 4 campaign images in `data/dev.sqlite`; this plan should avoid adding more rows to that database.

## Interfaces and Dependencies

New package script:

- `integration:live`

New script:

- `scripts/live-integration.ts`

Environment:

- `RUN_LIVE_INTEGRATION=1`
- `OPENAI_API_KEY`
- `CODEX_GATEWAY=sdk`
- `IMAGE_GENERATION_MODE=openai`
- `CODEX_SANDBOX_MODE=read-only`
- optional `LIVE_INTEGRATION_PORT`
- optional `LIVE_INTEGRATION_DATABASE_URL`
- optional `LIVE_INTEGRATION_SKIP_FLOW=1` for server-start smoke only
- optional `LIVE_INTEGRATION_SERVER_TIMEOUT_MS`
- optional `LIVE_INTEGRATION_STEP_TIMEOUT_MS`

HTTP routes covered:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/products/overview`
- `GET /api/products`
- `POST /api/campaign-opportunities`
- `POST /api/campaigns/generate`
- `GET /api/campaigns`
- `GET /api/campaigns/[campaignId]`
- `POST /api/campaigns/[campaignId]/images/generate`
- `GET /api/campaigns/[campaignId]/images`
- `GET /api/campaigns/[campaignId]/images/[imageId]`

Generated artifacts:

- `output/live-integration/*.json`
