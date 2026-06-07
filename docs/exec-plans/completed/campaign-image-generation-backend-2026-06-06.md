# Campaign Image Generation Backend

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `docs/PLAN.md`.

## Purpose / Big Picture

After this change, an authenticated demo user can take a saved campaign, generate one or two image variants from the saved `imagePrompt`, persist those images in SQLite, list saved image metadata, and fetch the raw image bytes for display by a future UI.

This plan intentionally does not build UI screens, image editing, object storage, background queues, approval flows, scheduling, or Shopify integration. The goal is the smallest backend slice that proves the V0 demo can move from Codex-generated `imagePrompt` text to a durable campaign image asset.

## Progress

- [x] (2026-06-06 12:15Z) [M0] Initial Plan 3 ExecPlan created.
- [x] (2026-06-06 12:16Z) [M0] Fresh sub-agent validation completed and useful feedback folded in.
- [x] (2026-06-06 12:19Z) [M0] Exact final-draft sub-agent validation completed and useful feedback folded in.
- [x] (2026-06-06 12:28Z) [M1] Image generation contract, OpenAI gateway, factory, and deterministic fake gateway implemented.
- [x] (2026-06-06 12:28Z) [M2] Campaign image persistence service implemented with saved-prompt lookup, owner checks, metadata DTOs, decoded byte persistence, and appended variant indexes.
- [x] (2026-06-06 12:28Z) [M3] Protected image generation, image metadata listing, and raw byte routes implemented.
- [x] (2026-06-06 12:28Z) [M4] Tests, README/docs notes, package smoke script, and validation completed.

## Surprises & Discoveries

- Observation: The existing Prisma schema already has a separate `CampaignImage` table with `imageData Bytes`, `mimeType`, `variantIndex`, `model`, `size`, `status`, and `errorMessage`.
  Evidence: `prisma/schema.prisma` lines 76-92.
- Observation: A live OpenAI image smoke test succeeded with the existing `OPENAI_API_KEY`.
  Evidence: `output/imagegen/openai-image-smoke.jpeg` was generated as a valid 1024x1024 JPEG in about 21 seconds. This output file is local smoke evidence and should not be committed unless the user explicitly wants a fixture image committed.
- Observation: Current official OpenAI docs expose GPT Image 2 through `v1/images/generations`, and generated images are returned as base64 data that can be decoded to bytes.
  Evidence: OpenAI image generation guide and create image API reference checked on 2026-06-06.
- Observation: A fresh sub-agent review flagged that OpenAI image docs can vary between docs surfaces and examples, with some examples showing older GPT image models.
  Evidence: Sub-agent review on 2026-06-06. The plan keeps the model value isolated and requires live smoke to fail clearly if the configured account/model combination is unsupported.
- Observation: Exact final-draft sub-agent validation approved implementation after small clarifications.
  Evidence: Sub-agent review on 2026-06-06 found no blockers and asked to clarify live smoke isolation, optional env loading, raw byte response typing, explicit fake test mode, and account/model access failure handling.
- Observation: Prisma `Bytes` in this repo's generated client expects a plain `Uint8Array<ArrayBuffer>`, not a Node `Buffer<ArrayBufferLike>`.
  Evidence: `pnpm typecheck` initially failed in `src/server/images/campaign-image-service.ts`; the persistence boundary now copies generated buffers into a plain `Uint8Array` before writing `CampaignImage.imageData`.
- Observation: `next build` rewrites `next-env.d.ts` between dev and production route type references.
  Evidence: The generated diff changed `./.next/dev/types/routes.d.ts` to `./.next/types/routes.d.ts`; it was reverted because it is generated noise outside Plan 3.
- Observation: A copied `.env.example` can contain `OPENAI_API_KEY=""`, which must not make fake/test mode fail.
  Evidence: `src/server/env.ts` now normalizes blank `OPENAI_API_KEY` to absent, and `tests/server/env.test.ts` covers this case.
- Observation: Fresh implementation review found one medium issue and three low issues after the worker implementation.
  Evidence: The medium partial/malformed OpenAI response issue was fixed with `tests/server/openai-image-generation-gateway.test.ts`; malformed JSON and `NODE_ENV=test` fallback safety were also fixed. Concurrent `variantIndex` writes remain a low residual demo risk.
- Observation: `pnpm typecheck` should not run in parallel with `pnpm build` because `next build` rewrites `.next/types` while TypeScript reads it.
  Evidence: A parallel validation run produced transient missing `.next/types/*.d.ts` errors; rerunning `pnpm typecheck` after build passed.

## Decision Log

- Decision: Use the OpenAI Images API directly, not the Responses API image tool, for this backend slice.
  Rationale: The app already has Codex generate a saved `imagePrompt`; Plan 3 only needs prompt-to-image generation and persistence.
  Date/Author: 2026-06-06 / Codex
- Decision: Use one server-side `OPENAI_API_KEY`.
  Rationale: The user explicitly wants one common OpenAI key and does not want a separate image key or extra credential flow.
  Date/Author: 2026-06-06 / User and Codex
- Decision: Add only a non-secret `IMAGE_GENERATION_MODE` switch for `fake` versus `openai`.
  Rationale: Tests and local fallback need a deterministic fake path, but credentials should stay simple. This switch is not a second key and does not expose secrets.
  Date/Author: 2026-06-06 / Codex, after sub-agent review
- Decision: Use `gpt-image-2` for live generation, with the implementation keeping the model constant isolated so it can be changed later without touching route logic.
  Rationale: Current OpenAI docs list GPT Image 2 as the state-of-the-art image model, and the local live smoke succeeded with it. Keeping the value isolated is enough configurability for the demo without adding env sprawl.
  Date/Author: 2026-06-06 / Codex
- Decision: Store decoded image bytes in SQLite through `CampaignImage.imageData`, not base64 strings.
  Rationale: The current demo is small and self-contained; SQLite blob storage is fine for a few generated images. Returning base64 in normal JSON would make API responses heavy.
  Date/Author: 2026-06-06 / Codex
- Decision: Do not persist failed image-generation rows in V0.
  Rationale: `imageData` and `mimeType` are required in the current schema. Failed rows would require a migration to make those nullable, which is not necessary for the demo.
  Date/Author: 2026-06-06 / Codex
- Decision: Keep tests deterministic with a fake image gateway and keep live OpenAI generation behind an explicit smoke command.
  Rationale: Unit and route tests must not spend API credits or depend on network/model availability.
  Date/Author: 2026-06-06 / Codex

## Outcomes & Retrospective

Implemented the backend image-generation slice without UI, object storage, queues, scheduling, image editing, Shopify, extra image keys, or unrelated refactors.

Validation completed on 2026-06-06:

- `pnpm db:verify` passed before live smoke: 1 user, 10 products, 40 product sales, 0 campaigns, 0 campaign images.
- `pnpm db:verify` passed after live smoke: 1 user, 10 products, 40 product sales, 1 campaign, 4 campaign images.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed: 11 files, 44 tests.
- `pnpm build` passed and included the new image API routes.
- `RUN_IMAGE_LIVE=1 pnpm image:smoke` passed four times with real OpenAI image calls. The final run reused campaign `cmq2bw7uo0000tupxpoyvtudr`, appended image `cmq2c96ke0000zkpxzuy4q9xv` at `variantIndex: 4`, and persisted `image/jpeg` bytes length `105272`.

The live smoke rows were left in the local dev database per the recovery guidance not to reset or clean generated smoke data casually.

## Context and Orientation

The repo is a local-first Next.js app with backend route handlers under `src/app/api`, server services under `src/server`, Prisma models under `prisma/schema.prisma`, and tests under `tests/server`.

Completed earlier plans already provide:

- seeded-only app auth with `demo@promo.test / demo-password`;
- durable SQLite persistence through Prisma;
- protected campaign APIs;
- Codex SDK campaign generation that saves `instagramCaption`, `imagePrompt`, and `codexReasoning`;
- a `CampaignImage` model that is ready for generated image variants.

Relevant existing files:

- `docs/product/image-generation.md` defines the role split: Codex creates image prompts, backend creates images.
- `ARCHITECTURE.md` says backend owns image generation API calls, image storage, response validation, and UI-facing API responses.
- `docs/product/data-model.md` says one campaign can have many generated images.
- `src/server/campaigns/campaign-service.ts` owns campaign persistence and user scoping.
- `src/app/api/campaigns/[campaignId]/route.ts` shows the protected campaign-detail route pattern.
- `src/server/env.ts` currently reads database/session env only.
- `tests/server/campaign-routes.test.ts` shows authenticated route testing with seeded sessions.

Definitions for this plan:

- Image gateway: a small interface that hides whether image bytes come from OpenAI or a deterministic fake implementation.
- Raw image route: an API route that returns the binary `CampaignImage.imageData` value with the saved `Content-Type`, rather than JSON.
- Image metadata: fields needed by future UI, such as `imageId`, `campaignId`, `variantIndex`, `mimeType`, `model`, `size`, `status`, and `createdAt`, without `imageData`.

## Milestones

Milestone 1: Image Generation Contract and Gateways

At the end of this milestone, the repo has a typed image generation boundary that can call OpenAI in live mode and return deterministic bytes in fake/test mode. The work touches `package.json`, `pnpm-lock.yaml`, `src/server/env.ts`, and new files under `src/server/images`.

Implementation details:

- Add the official `openai` package as a direct runtime dependency.
- Add `OPENAI_API_KEY` to `.env.example`.
- Add `IMAGE_GENERATION_MODE` for deterministic fake/test mode.
  - Current setup defaults live image generation in code, so `.env.example` only needs `OPENAI_API_KEY`.
  - `.env.test.example`: `IMAGE_GENERATION_MODE="fake"`.
- Do not add separate `OPENAI_IMAGE_*` env vars in Plan 3.
- Do not make `OPENAI_API_KEY` globally required in `getServerEnv()`. It should be optional there and required only by the OpenAI image gateway or factory when `IMAGE_GENERATION_MODE="openai"`.
- Set `IMAGE_GENERATION_MODE="fake"` explicitly in test setup, not only through `NODE_ENV === "test"`.
- Keep the image defaults in code near the gateway:
  - model: `gpt-image-2`;
  - size: `1024x1024`;
  - quality: `low`;
  - output format: `jpeg`;
  - maximum variants per request: `2`.
- Do not add separate image API keys.
- Create an image gateway interface, for example:

      export type GenerateCampaignImageInput = {
        prompt: string;
        variants: number;
      };

      export type GeneratedImage = {
        bytes: Buffer;
        mimeType: string;
        model: string;
        size: string;
      };

      export interface ImageGenerationGateway {
        generateImages(input: GenerateCampaignImageInput): Promise<GeneratedImage[]>;
      }

- Implement `OpenAIImageGenerationGateway` using:

      const result = await client.images.generate({
        model: "gpt-image-2",
        prompt,
        n: variants,
        size: "1024x1024",
        quality: "low",
        output_format: "jpeg"
      });

- Decode `data[*].b64_json` with `Buffer.from(value, "base64")`.
- Throw an app-level image generation error if OpenAI returns no image data.
- Implement `FakeImageGenerationGateway` that returns deterministic tiny image bytes without network access.
- Add a gateway factory that uses the fake gateway when `IMAGE_GENERATION_MODE="fake"` or `NODE_ENV === "test"`, and otherwise uses OpenAI.
- If `IMAGE_GENERATION_MODE="openai"` and `OPENAI_API_KEY` is missing, throw a clear app error before calling the SDK.

Validation for this milestone:

      cd /Users/mahesh/Projects/ecom-promo-codex
      pnpm typecheck
      pnpm test

Expected result: TypeScript accepts the new gateway contract, and tests do not call the network.

Milestone 2: Campaign Image Persistence Service

At the end of this milestone, backend code can generate image variants for a campaign owned by a user and save one `CampaignImage` row per variant. The work touches new service files under `src/server/images` and may reuse campaign lookup patterns from `src/server/campaigns/campaign-service.ts`.

Implementation details:

- Add a service function shaped like:

      generateImagesForCampaign({
        userId,
        campaignId,
        variants
      }, gateway?)

- Require that the campaign exists and belongs to the authenticated user.
- Read the saved `campaign.imagePrompt`; do not accept an arbitrary prompt from the request body.
- Normalize `variants` to default `1`, min `1`, max `2`.
- Before saving, compute the next `variantIndex` for that campaign from existing image rows so repeated generation appends variants instead of reusing index `1`.
- Save one `CampaignImage` row per generated image:
  - `campaignId`;
  - `prompt`;
  - `imageData`;
  - `mimeType`;
  - `variantIndex`;
  - `model`;
  - `size`;
  - `status: "completed"`.
- Return metadata only. Do not include `imageData` in JSON DTOs.
- On OpenAI or gateway failure, return an app error and do not create partial rows for V0.
- Add explicit error mapping:
  - missing API key in live mode: `IMAGE_GENERATION_UNAVAILABLE`, HTTP 503;
  - OpenAI API failure, unsupported model, account/org verification issue, rate limit, or malformed/missing `b64_json`: `IMAGE_GENERATION_ERROR`, HTTP 502.

Validation for this milestone:

      cd /Users/mahesh/Projects/ecom-promo-codex
      pnpm test -- tests/server/campaign-image-service.test.ts

Expected result: service tests prove ownership checks, variant count validation, metadata shape, persisted bytes, and sequential `variantIndex` behavior.

Milestone 3: Protected API Routes

At the end of this milestone, authenticated clients can trigger generation, list image metadata, and fetch raw image bytes. The work adds route handlers under `src/app/api/campaigns/[campaignId]/images`.

Routes to add:

      POST /api/campaigns/[campaignId]/images/generate
      GET  /api/campaigns/[campaignId]/images
      GET  /api/campaigns/[campaignId]/images/[imageId]

Route behavior:

- Every route calls `requireSession(request)`.
- Every route enforces campaign ownership through `userId`.
- The raw image route must verify both the campaign owner and `image.campaignId === campaignId`; it must not allow image lookup by `imageId` alone.
- `POST /generate` accepts an optional JSON body:

      {
        "variants": 1
      }

- `POST /generate` returns status `201` with metadata:

      {
        "data": {
          "images": [
            {
              "imageId": "...",
              "campaignId": "...",
              "variantIndex": 1,
              "mimeType": "image/jpeg",
              "model": "gpt-image-2",
              "size": "1024x1024",
              "status": "completed",
              "createdAt": "..."
            }
          ]
        }
      }

- `GET /images` returns all image metadata for the campaign sorted by `variantIndex` and `createdAt`.
- `GET /images/[imageId]` returns raw bytes with:
  - `Content-Type` set to the saved `mimeType`;
  - `Cache-Control: no-store`;
  - a valid `BodyInit`, converting Prisma `Bytes` with `Buffer.from(image.imageData)` if needed;
  - 404 if the image does not exist or does not belong to the user's campaign.
- Do not include raw bytes in campaign detail or campaign list JSON in this plan.
- Follow the existing `{ data }` / `{ error }` JSON convention for JSON routes. The raw image route is the only exception because it returns binary bytes.

Validation for this milestone:

      cd /Users/mahesh/Projects/ecom-promo-codex
      pnpm test -- tests/server/campaign-image-routes.test.ts

Expected result: route tests cover unauthenticated rejection, generation with fake bytes, metadata listing without `imageData`, raw byte serving, campaign ownership, missing image 404s, and invalid variants.

Milestone 4: Smoke Script, Documentation, and Full Verification

At the end of this milestone, the full backend image slice is documented and verified without requiring UI work. The work touches `README.md`, maybe `docs/product/image-generation.md` if durable behavior changed, and a new live smoke script under `scripts`.

Implementation details:

- Add a script such as `scripts/image-smoke.ts`.
- Add a package script such as:

      "image:smoke": "tsx scripts/image-smoke.ts"

- The smoke script should default to skip unless explicitly enabled:

      RUN_IMAGE_LIVE=1 pnpm image:smoke

- In live mode, the script should:
  - require `OPENAI_API_KEY`;
  - create or reuse a small smoke campaign without invoking Codex generation;
  - call the image generation service with one variant;
  - verify a `CampaignImage` row exists;
  - verify bytes are non-empty and `mimeType` is `image/jpeg`.
- README should mention `OPENAI_API_KEY` as the one OpenAI key needed for live Codex/image demo paths.
- README should mention `IMAGE_GENERATION_MODE` only as a runtime mode switch, not as another credential.
- Keep generated smoke images and local `output/` artifacts uncommitted unless the user explicitly asks to keep fixtures.

Full validation:

      cd /Users/mahesh/Projects/ecom-promo-codex
      pnpm db:verify
      pnpm typecheck
      pnpm lint
      pnpm test
      pnpm build
      RUN_IMAGE_LIVE=1 pnpm image:smoke

Expected result:

- seeded DB verification still passes;
- all tests pass without network access;
- build succeeds;
- live smoke creates one real image row when `OPENAI_API_KEY` is available;
- no API key is printed in logs;
- `git status --short` shows only intended source/doc changes plus any intentionally retained local smoke output.

## Plan of Work

Start by adding the direct `openai` dependency and the image gateway boundary. Keep this code separate from campaign services so the app can test persistence without making network calls. Then add the campaign image persistence service that owns user scoping, prompt lookup, variant normalization, and `CampaignImage` writes. After the service is tested, expose three protected route handlers under the existing campaign URL space.

Use the existing `AppError` and `errorResponse` pattern. Add `IMAGE_GENERATION_UNAVAILABLE` and `IMAGE_GENERATION_ERROR` to `AppErrorCode` so missing credentials and provider/output failures are clear during the demo.

Do not change the existing `Campaign` schema or create a new database migration unless implementation discovers that Prisma cannot save the required `Bytes` values. The current schema is already shaped for this plan.

Do not modify MCP tools. MCP remains read-only product and sales context. Codex remains responsible for the `imagePrompt`; the backend remains responsible for calling OpenAI image generation and saving the result.

## Concrete Steps

1. Prepare the working tree:

      cd /Users/mahesh/Projects/ecom-promo-codex
      git status --short --branch
      pnpm db:verify

2. Add OpenAI dependency:

      pnpm add openai

3. Add image generation gateway files under `src/server/images`.

4. Add campaign image service functions and DTO helpers under `src/server/images` or a clearly named neighboring module.

5. Add protected route handlers:

      src/app/api/campaigns/[campaignId]/images/generate/route.ts
      src/app/api/campaigns/[campaignId]/images/route.ts
      src/app/api/campaigns/[campaignId]/images/[imageId]/route.ts

6. Add focused tests:

      tests/server/campaign-image-service.test.ts
      tests/server/campaign-image-routes.test.ts

7. Add live smoke script and package script.

8. Update README and any durable doc wording needed for the exact backend behavior.

9. Run full validation:

      pnpm db:verify
      pnpm typecheck
      pnpm lint
      pnpm test
      pnpm build
      RUN_IMAGE_LIVE=1 pnpm image:smoke

10. Update this ExecPlan with validation evidence and any surprises.

## Validation and Acceptance

This plan is accepted when all of the following are true:

- A saved campaign can generate at least one persisted `CampaignImage` row from its saved `imagePrompt`.
- A single campaign can have multiple image rows.
- Image bytes are stored as Prisma `Bytes`, not base64 strings.
- Normal JSON responses include image metadata only.
- Raw image bytes are served through the image route with the correct `Content-Type`.
- Tests use a fake image gateway and do not call OpenAI.
- Live smoke uses the real OpenAI Images API only when explicitly enabled.
- `OPENAI_API_KEY` is read only on the backend and is never exposed through route responses or logs.
- Missing key, unsupported model, rate limit, malformed provider output, and wrong-user image access all produce clear errors.
- Account/model/org verification failures are mapped cleanly as image provider failures.
- No UI code is added in this plan.
- No object storage, queues, scheduling, image editing, or Shopify integration is added.

## Idempotence and Recovery

Tests can be rerun safely because test setup deletes campaign images and campaigns before each relevant test.

`POST /api/campaigns/[campaignId]/images/generate` is intentionally not idempotent. Each successful call appends new image variants. This is acceptable for V0 because the user action is "generate another variant."

If OpenAI image generation fails, the route should return a clear error and create no image rows. The user can retry the same request later.

If live smoke creates unwanted local campaign images, clean them with Prisma Studio or a small cleanup script only after confirming with the user. Do not reset the database casually.

If `OPENAI_API_KEY` is missing, tests should still pass with fake generation. Live smoke should skip or fail with a clear message, not an unclear stack trace.

## Artifacts and Notes

Local smoke evidence from before this plan:

      output/imagegen/openai-image-smoke.jpeg
      JPEG image data, 1024x1024, about 71 KB

This file proves the local key can generate images, but it is not required for implementation and should remain untracked unless the user asks for it.

Official OpenAI references checked for this plan:

- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/models/gpt-image-2
- https://developers.openai.com/api/reference/resources/images/methods/generate

## Interfaces and Dependencies

Runtime dependency:

- `openai`

Environment:

- `OPENAI_API_KEY`: one common server-side OpenAI API key used for live image generation.
- `IMAGE_GENERATION_MODE`: non-secret runtime mode switch. Use `openai` for live generation and `fake` for deterministic local/test generation.

Database:

- `Campaign`
- `CampaignImage`

New backend concepts:

- image generation gateway interface;
- OpenAI image gateway;
- fake image gateway;
- campaign image persistence service;
- image metadata DTO;
- raw image response route.

New routes:

- `POST /api/campaigns/[campaignId]/images/generate`
- `GET /api/campaigns/[campaignId]/images`
- `GET /api/campaigns/[campaignId]/images/[imageId]`

New validation commands:

- `pnpm test -- tests/server/campaign-image-service.test.ts`
- `pnpm test -- tests/server/campaign-image-routes.test.ts`
- `RUN_IMAGE_LIVE=1 pnpm image:smoke`
