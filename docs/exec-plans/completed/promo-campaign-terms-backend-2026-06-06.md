# Add promo campaign terms and initial image generation

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `docs/exec-plans/README.md`.

## Purpose / Big Picture

Update the backend so the app creates a real promo campaign, not only an Instagram caption and image prompt.

After this change, the backend supports the agreed product flow:

- the products page can ask Codex to suggest products that need promotion attention;
- the user selects one product and starts campaign creation;
- the campaign create page sends discount, quantity limit, initial image variant count, and optional instructions;
- Codex generates campaign content and image prompt using product context plus those offer terms;
- the backend generates the requested initial image variants during the same campaign creation action;
- campaign history can be filtered for one product;
- campaign detail returns saved content, offer terms, and image metadata.

This plan is backend-only. It does not implement the UI pages or generate new UI images.

## Progress

- [x] (2026-06-06 16:39Z) [M1] Initial backend ExecPlan drafted after updating product docs for the new promo campaign scenario.
- [x] (2026-06-06 16:39Z) [M1] Validated draft with a fresh sub-agent and applied useful feedback.
- [x] (2026-06-06 16:54Z) [M2] Added campaign offer-term fields to Prisma schema, created migration `20260606165402_campaign_offer_terms`, and regenerated the Prisma client.
- [x] (2026-06-06 16:56Z) [M3] Updated campaign request/response schemas, Codex input, prompt construction, fake gateway output, and campaign service validation.
- [x] (2026-06-06 16:56Z) [M4] Added initial image generation during campaign creation with no partial campaign save on image failure.
- [x] (2026-06-06 16:56Z) [M5] Added `GET /api/campaigns?productId=<productId>` filtering, image-aware campaign detail, and `imageCount` in campaign summaries.
- [x] (2026-06-06 17:00Z) [M6] Updated tests, smoke scripts, live integration, README example, and image-generation docs; validated locally and live.

## Surprises & Discoveries

- Observation: Earlier backend work treated image generation as a separate second-step action only.
  Evidence: `docs/product/image-generation.md` previously described `Saved campaign -> user clicks Generate Image Variants`.

- Observation: The current campaign model does not store offer terms.
  Evidence: `prisma/schema.prisma` `Campaign` currently has `prompt`, `optionalInstructions`, `instagramCaption`, `imagePrompt`, and `codexReasoning`, but no discount or quantity fields.

- Observation: The current campaign create API does not require enough input for a real promo campaign.
  Evidence: `src/server/campaigns/campaign-schemas.ts` currently accepts only `productId` and optional instructions for `generateCampaignRequestSchema`.

- Observation: The first backend plan draft left response shape, migration handling, and initial image helper boundaries too open.
  Evidence: Fresh sub-agent review called out those areas as likely demo-breaking ambiguity.

- Observation: Live integration now proves both initial image creation and later append behavior.
  Evidence: `output/live-integration/2026-06-06T16-59-14-859Z.json` reports `initialImageCount: 1`, `campaignImages: 2`, one campaign, and Codex session JSONL files under `output/codex-runtime/home`.

## Decision Log

- Decision: Store `discountPercent`, `quantityLimit`, and `initialImageVariantsRequested` on `Campaign`.
  Rationale: These are business terms of the promo campaign and should be visible in campaign history/detail without re-parsing prompts.
  Date/Author: 2026-06-06 / Codex

- Decision: Add the new campaign integer fields with Prisma defaults for migration compatibility, while still requiring explicit values at the API/service layer.
  Rationale: Local demo SQLite databases may already contain campaign rows. Defaults let migration/backfill succeed without weakening the user-facing create contract.
  Date/Author: 2026-06-06 / Codex

- Decision: Use `imageVariants` as the request field and persist it as `initialImageVariantsRequested`.
  Rationale: The UI label is "Image variants", while the stored field should be explicit that it captures the initial creation request. Additional variants can be appended later.
  Date/Author: 2026-06-06 / Codex

- Decision: Validate `imageVariants` as a required integer from 1 through `MAX_IMAGE_VARIANTS`.
  Rationale: Campaign creation should reject invalid image counts instead of silently normalizing a required form field.
  Date/Author: 2026-06-06 / Codex

- Decision: Validate `discountPercent` as an integer from 1 to 100.
  Rationale: Zero means no promo, and 100 is the natural upper bound for a discount percentage.
  Date/Author: 2026-06-06 / Codex

- Decision: Validate `quantityLimit` as a positive integer that cannot exceed the selected product's available quantity.
  Rationale: A promo quantity limit should not exceed available stock.
  Date/Author: 2026-06-06 / Codex

- Decision: Generate image bytes before the database transaction that saves the campaign and images.
  Rationale: External OpenAI calls should not run inside a database transaction. If image generation fails, no partial campaign should be saved for this create action.
  Date/Author: 2026-06-06 / Codex

- Decision: Introduce a prompt-based image helper for initial campaign creation.
  Rationale: The existing image service loads an already-saved campaign before appending images. Initial creation needs a helper that can generate image bytes from a prompt before the campaign row exists.
  Date/Author: 2026-06-06 / Codex

- Decision: `POST /api/campaigns/generate` returns `{ campaign, images }`.
  Rationale: This mirrors the existing image endpoint's `{ images }` shape while making the newly saved campaign available to the UI. Raw image bytes are never returned in JSON.
  Date/Author: 2026-06-06 / Codex

- Decision: Campaign detail returns `{ campaign, images }`, and campaign summaries include `imageCount`.
  Rationale: Product campaign history needs a lightweight count, while campaign detail needs image metadata for display.
  Date/Author: 2026-06-06 / Codex

- Decision: Keep the existing additional-image endpoint.
  Rationale: `POST /api/campaigns/[campaignId]/images/generate` remains useful for "generate another image variant" after a campaign exists.
  Date/Author: 2026-06-06 / Codex

- Decision: Add product campaign-history support through `GET /api/campaigns?productId=<productId>` instead of creating a new route immediately.
  Rationale: The existing campaigns route already lists campaigns for the authenticated user. Optional filtering keeps the V0 API small.
  Date/Author: 2026-06-06 / Codex

## Outcomes & Retrospective

Implemented the backend promo campaign contract:

- `Campaign` now stores `discountPercent`, `quantityLimit`, and `initialImageVariantsRequested`.
- `POST /api/campaigns/generate` now requires product id, discount, quantity limit, image variant count, and optional instructions.
- Campaign creation validates stock limits, asks Codex with the offer terms, generates initial image bytes, and saves the campaign plus image rows in one transaction.
- If initial image generation fails, no campaign row is saved.
- Campaign list supports optional `productId` filtering and returns `imageCount`.
- Campaign detail returns `{ campaign, images }`.
- Additional image generation still appends variants to an existing campaign.

Validation evidence:

- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed: 15 files, 71 tests.
- `pnpm build` passed.
- `RUN_LIVE_INTEGRATION=1 pnpm integration:live` passed with `SKU-COF-COLD-001`, discount `15`, quantity limit `50`, one initial image, one appended image, JPEG bytes, and two Codex SDK session JSONL files.

Remaining backend debt: none for this ExecPlan. The next work should be UI implementation against this backend contract.

## Context and Orientation

Repository root:

    /Users/mahesh/Projects/ecom-promo-codex

Current durable docs updated for this plan:

- `VISION.md`
- `ARCHITECTURE.md`
- `docs/product/campaign-workflow.md`
- `docs/product/data-model.md`
- `docs/product/image-generation.md`
- `docs/product/codex-tools.md`
- `docs/product/dashboard/README.md`

Relevant current backend files:

- `prisma/schema.prisma` defines `Campaign` and `CampaignImage`.
- `src/server/campaigns/campaign-schemas.ts` defines campaign API request and DTO schemas.
- `src/server/campaigns/campaign-service.ts` creates, lists, and reads campaigns.
- `src/server/codex/codex-gateway.ts` defines campaign-generation input.
- `src/server/codex/codex-prompts.ts` builds the prompt for Codex campaign generation.
- `src/server/images/campaign-image-service.ts` generates and appends campaign image variants.
- `src/app/api/campaigns/generate/route.ts` exposes campaign creation.
- `src/app/api/campaigns/route.ts` lists campaigns.
- `src/app/api/campaigns/[campaignId]/route.ts` returns campaign detail.
- `src/app/api/products/[productId]/campaign-context/route.ts` already exposes product campaign context.

Important terms:

- Offer terms: the required user-entered campaign fields `discountPercent` and `quantityLimit`.
- Initial image variants: image variants generated during the campaign create action.
- Additional image variants: image variants generated later for an already saved campaign.
- Campaign create action: the backend call that validates offer terms, asks Codex for content, generates initial images, and persists the result.

## Milestones

Milestone 1: Finalize the plan.

At the end of this milestone, a fresh sub-agent has reviewed this exact plan, and useful feedback has been applied. No backend code should change before this review is reflected in `Progress` and `Decision Log`.

Milestone 2: Add persistence for promo terms.

At the end of this milestone, `Campaign` stores the required offer terms and initial image variant request count. The work touches `prisma/schema.prisma`, migration files if the repo creates a migration, generated Prisma client files, and tests that create campaigns directly.

Add the fields with migration-safe defaults:

- `discountPercent Int @default(15)`;
- `quantityLimit Int @default(100)`;
- `initialImageVariantsRequested Int @default(1)`.

The defaults exist for existing local/demo rows only. API and service validation must still require explicit values for new campaign creation.

Run:

    pnpm db:migrate -- --name campaign-offer-terms
    pnpm prisma:generate
    pnpm test

Expected proof: campaign tests can create/read campaigns with `discountPercent`, `quantityLimit`, and `initialImageVariantsRequested`.

Milestone 3: Update campaign request, response, and Codex prompt contracts.

At the end of this milestone, campaign creation requires:

- `productId`;
- `discountPercent`;
- `quantityLimit`;
- `imageVariants`;
- optional `optionalInstructions`.

The backend validates the selected product, ensures `quantityLimit` does not exceed stock, passes offer terms to Codex, and returns those terms in campaign DTOs.

The work touches:

- `src/server/campaigns/campaign-schemas.ts`;
- `src/server/campaigns/campaign-service.ts`;
- `src/server/codex/codex-gateway.ts`;
- `src/server/codex/codex-prompts.ts`;
- fake and SDK gateway tests where needed.

Milestone 4: Generate initial images during campaign creation.

At the end of this milestone, `POST /api/campaigns/generate` creates campaign content and initial image variants in one action.

The response contract is:

    {
      "data": {
        "campaign": { "...": "campaign fields, no raw image bytes" },
        "images": [{ "...": "image metadata, no raw image bytes" }]
      }
    }

Implementation guidance:

- use the existing fake/live image gateway paths;
- add a reusable helper such as `generateCampaignImageBytes({ prompt, variants }, gateway)` that does not require a saved campaign;
- generate image bytes after Codex returns the image prompt and before the database transaction;
- assert that the generated image count matches the requested `imageVariants` count before persisting;
- save the campaign and `CampaignImage` rows inside one transaction;
- if image generation fails, return an image-generation error and do not save a partial campaign;
- keep `POST /api/campaigns/[campaignId]/images/generate` for additional variants after campaign creation.

Milestone 5: Support product campaign history and image-aware campaign detail.

At the end of this milestone:

- `GET /api/campaigns?productId=<productId>` returns campaigns for the authenticated user and selected product only;
- `GET /api/campaigns/[campaignId]` returns `{ campaign, images }`, including offer terms and image metadata;
- list summaries include enough fields for product detail history, such as campaign id, product id, product name, discount, quantity limit, `imageCount`, and created date.

If the current campaign route shape becomes awkward, create a small product-specific route only after recording the reason in this plan.

Milestone 6: Update validation, smoke scripts, and live integration.

At the end of this milestone, all tests and live scripts know the new campaign creation contract.

Run:

    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm build

When `OPENAI_API_KEY` is available, run:

    RUN_LIVE_INTEGRATION=1 pnpm integration:live

Expected proof:

- unit tests pass;
- route tests prove missing discount/quantity/imageVariants are validation errors;
- route tests prove campaign creation persists offer terms and initial image metadata;
- service tests prove no campaign is saved if initial image generation fails;
- live integration proves the full flow creates a campaign with offer terms and initial images, then separately proves the additional-image endpoint appends a later variant.

## Plan of Work

Start with the schema and test fixtures because required campaign fields will break direct campaign creation in tests. Add the new campaign fields, regenerate Prisma client, and update every direct `prisma.campaign.create` call in tests to include realistic offer terms.

Next, update schemas and service input types. Make the request contract strict so UI cannot create a campaign without discount, quantity limit, or image variant count. Keep optional instructions optional and trimmed.

Then update Codex prompt input so Codex sees the offer terms as business facts. The prompt should say clearly that discount and quantity limit are user-entered offer terms and should be reflected in campaign content.

After campaign content generation works, integrate initial image generation. Prefer extracting reusable image-generation helpers instead of duplicating byte conversion or error mapping logic. Do not call the external image provider inside a Prisma transaction.

Finally, update list/detail APIs and tests so the future UI can show product campaign history and campaign detail with images.

## Concrete Steps

1. Check current status:

       cd /Users/mahesh/Projects/ecom-promo-codex
       git status --short

2. Update Prisma schema:

   - add `discountPercent Int @default(15)` to `Campaign`;
   - add `quantityLimit Int @default(100)` to `Campaign`;
   - add `initialImageVariantsRequested Int @default(1)` to `Campaign`;
   - keep existing campaign/image relationships unchanged.

3. Run migration/generation:

       pnpm db:migrate -- --name campaign-offer-terms
       pnpm prisma:generate

4. Update campaign schemas:

   - request schema requires `discountPercent`, `quantityLimit`, and `imageVariants`;
   - `imageVariants` must be an integer from 1 through `MAX_IMAGE_VARIANTS`;
   - base campaign DTO includes offer terms but no image bytes;
   - create/detail responses use `{ campaign, images }`;
   - campaign summary DTO includes offer terms and `imageCount`.

5. Update campaign service:

   - extend `GenerateCampaignInput`;
   - validate the user exists;
   - load product campaign context;
   - reject quantity limits above available stock;
   - normalize optional instructions;
   - call Codex with offer terms;
   - generate initial images from the returned image prompt;
   - verify the initial image count equals `imageVariants`;
   - save campaign and image rows in one transaction;
   - return sanitized campaign and image metadata.

6. Update image service helpers:

   - keep append behavior for existing campaign image generation;
   - add a prompt-based helper for pre-campaign initial image generation;
   - extract reusable image metadata mapping or prompt-based generation helper if useful;
   - preserve existing variant-index behavior.

7. Update routes:

   - `POST /api/campaigns/generate` parses the new request shape and returns the new response shape;
   - `GET /api/campaigns` accepts optional `productId` query filtering;
   - `GET /api/campaigns/[campaignId]` returns `{ campaign, images }`.

8. Update Codex prompt and gateways:

   - extend `GenerateInstagramCampaignInput`;
   - update fake gateway output to reflect discount/quantity where appropriate;
   - update prompt tests to assert offer terms appear in the campaign-generation prompt.

9. Update tests and scripts:

   - campaign service tests;
   - campaign route tests;
   - campaign image service/route tests that create campaigns directly;
   - Codex prompt tests;
   - live integration script payload and assertions. The live script should send `discountPercent`, `quantityLimit`, and `imageVariants` in the create request, assert initial image metadata in the create response, assert list/detail include offer fields and image metadata/count, and then call the additional-image endpoint once to prove append-only variants still work;
   - README curl example after implementation.

10. Run validation commands and record evidence in this plan.

## Validation and Acceptance

Required local checks:

    cd /Users/mahesh/Projects/ecom-promo-codex
    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm build

Expected: all commands pass.

Behavioral acceptance:

- `POST /api/campaigns/generate` rejects payloads missing `discountPercent`, `quantityLimit`, or `imageVariants`.
- `POST /api/campaigns/generate` rejects `quantityLimit` greater than the product's available quantity.
- `POST /api/campaigns/generate` rejects `imageVariants` outside `1..MAX_IMAGE_VARIANTS`.
- A successful campaign create call persists campaign offer terms.
- A successful campaign create call persists the requested initial image variants.
- A successful campaign create response is exactly `{ campaign, images }` under `data`.
- The returned JSON does not expose raw image bytes.
- If initial image generation fails, no campaign row is saved.
- Existing additional image generation still appends variants to a saved campaign.
- `GET /api/campaigns?productId=<productId>` returns only campaigns for that product and current user.
- `GET /api/campaigns/[campaignId]` returns `{ campaign, images }` under `data`, including offer terms and image metadata.

Live acceptance when credentials are available:

    RUN_LIVE_INTEGRATION=1 pnpm integration:live

Expected: the report shows one campaign created with offer terms, at least one initial campaign image returned from campaign creation, one additional image appended by the existing image endpoint, and Codex session JSONL files under `output/codex-runtime/home`.

## Idempotence and Recovery

Prisma migrations can be rerun through the normal migration workflow. Test setup resets `data/test.sqlite`, and live integration resets `data/live-integration.sqlite`.

If migration generation creates unexpected drift, inspect:

    git diff prisma/schema.prisma
    git status --short prisma

If image generation fails during tests, confirm `IMAGE_GENERATION_MODE=fake` is set by test setup. Live image generation should only run under explicit live commands.

If the campaign create service saves a campaign before image generation fails, treat it as a bug for this plan and adjust the operation order so no partial campaign is persisted on initial-create failure.

Do not commit `.env`, `data/`, `output/`, or generated local screenshots.

## Artifacts and Notes

Relevant docs updated before this plan:

- `docs/product/campaign-workflow.md`
- `docs/product/data-model.md`
- `docs/product/image-generation.md`
- `docs/product/codex-tools.md`
- `VISION.md`
- `ARCHITECTURE.md`

Dashboard references saved for later UI work:

- `docs/product/dashboard/simple-products-dashboard-02.png`
- `docs/product/dashboard/products-campaign-flow-popup.png`
- `docs/product/dashboard/README.md`

This plan supersedes the earlier simple dashboard UI ExecPlan that existed only as an uncommitted draft. The UI plan should be recreated later after the backend contract is updated.

## Interfaces and Dependencies

Request contract for campaign creation:

    POST /api/campaigns/generate
    {
      "productId": "...",
      "discountPercent": 15,
      "quantityLimit": 100,
      "imageVariants": 2,
      "optionalInstructions": "Optional user guidance"
    }

Campaign persistence:

- `Campaign.discountPercent Int @default(15)`
- `Campaign.quantityLimit Int @default(100)`
- `Campaign.initialImageVariantsRequested Int @default(1)`
- existing `Campaign.instagramCaption`
- existing `Campaign.imagePrompt`
- existing `Campaign.codexReasoning`
- existing `CampaignImage` rows

Create/detail response contract:

    {
      "data": {
        "campaign": {
          "campaignId": "...",
          "productId": "...",
          "discountPercent": 15,
          "quantityLimit": 100,
          "initialImageVariantsRequested": 2,
          "instagramCaption": "...",
          "imagePrompt": "...",
          "codexReasoning": "...",
          "createdAt": "..."
        },
        "images": [
          {
            "imageId": "...",
            "campaignId": "...",
            "variantIndex": 1,
            "mimeType": "image/jpeg",
            "model": "...",
            "size": "...",
            "status": "completed",
            "createdAt": "..."
          }
        ]
      }
    }

Campaign summary response fields include `discountPercent`, `quantityLimit`, `initialImageVariantsRequested`, and `imageCount`.

Existing services to preserve:

- `findCampaignOpportunitiesForUser` still only suggests products and does not persist campaigns.
- `generateImagesForCampaign` still appends additional variants to an existing campaign.
- MCP tools remain read-only.

External dependencies:

- Codex SDK via backend `OPENAI_API_KEY`.
- OpenAI image generation via backend `OPENAI_API_KEY`.
- Fake gateways remain available for deterministic tests.
