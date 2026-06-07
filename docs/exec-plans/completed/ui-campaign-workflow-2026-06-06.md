# Build the promo campaign UI workflow

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `docs/PLANS.md`.

## Purpose / Big Picture

Build the first real frontend for Retail Promo Agent.

After this change, a user can open the app, sign in with the seeded demo account, see product metrics and product sales, ask Codex for promotion suggestions, inspect a product's campaign history, create a promo campaign, and view generated campaign details plus generated image variants.

This plan implements the UI against the current backend. It does not add new database fields for image aspect ratio or custom image prompts yet. The UI will capture those fields and pass the custom design direction through the existing campaign instructions path for now.

## Progress

- [x] (2026-06-06 17:36Z) [M1] Saved the four accepted UI reference images into `docs/dashboard/`.
- [x] (2026-06-06 17:36Z) [M1] Created the UI workflow ExecPlan from the accepted references and current backend contract.
- [x] (2026-06-06 18:04Z) [M2] Added the frontend app shell, Tailwind/shadcn visual foundation, and seeded login.
- [x] (2026-06-06 18:04Z) [M3] Implemented products dashboard, promotion suggestions popup, and product selection.
- [x] (2026-06-06 18:04Z) [M4] Implemented product detail with real product facts and campaign history.
- [x] (2026-06-06 18:04Z) [M5] Implemented campaign create/view page with campaign details, custom image prompt, aspect ratio control, and generated images.
- [x] (2026-06-06 18:04Z) [M6] Validated with tests, build, in-app Browser checks, and screenshots against the accepted references.
- [x] (2026-06-06 18:34Z) Added loading states, whole-row product/campaign navigation, updated suggestion naming, and live OpenAI Browser smoke validation.
- [x] (2026-06-07 04:05Z) Refined suggestion UX: removed `Use suggestion`, added row-level `View recommendation` popovers, outside-click close behavior, and direct `Create campaign` from the recommendation.

## Surprises & Discoveries

- Observation: The repo currently has backend API routes but no real frontend page, layout, Tailwind config, or shadcn components.
  Evidence: `src/app` contains API routes only, and `pnpm dlx shadcn@latest info --json` reported `tailwindVersion: null` and no installed components.

- Observation: The backend does not yet persist image aspect ratio or custom image prompt separately.
  Evidence: `Campaign` stores `optionalInstructions`, `discountPercent`, `quantityLimit`, `initialImageVariantsRequested`, `imagePrompt`, and generated images, but no `aspectRatio` or `customImagePrompt` fields.

- Observation: Fresh subagent review found no blockers, but confirmed that the product detail and campaign history screenshots are richer than the current backend response.
  Evidence: Products expose SKU, name, category, price, available quantity, current-month sales, recent sales summary, and signal facts. Campaign history summaries expose image counts, not thumbnail image IDs.

- Observation: Fresh local validation needs seeded data before the seeded login works.
  Evidence: `demo@promo.test / demo-password` is created by `pnpm db:seed`, and migrations are applied by `pnpm db:migrate`.

- Observation: Detached local server startup was not reliable in this environment, but supervised Next startup works.
  Evidence: `next dev` and `next start` exited silently when detached, while the supervised `pnpm exec next start --hostname 127.0.0.1 --port 3000` session reported ready and `/api/health` returned ok.

- Observation: The in-app Browser text entry helper could not fill textareas in this session, but clicking and live generation worked.
  Evidence: the live smoke used the default campaign instructions, generated a campaign, and rendered one `gpt-image-2` image through the protected image route.

## Decision Log

- Decision: Build one cohesive client-side root page for the V0 UI instead of adding multiple Next routes immediately.
  Rationale: The demo needs a fast, navigable workflow more than route architecture. A single client page can still call real backend APIs and show all four states.
  Date/Author: 2026-06-06 / Codex

- Decision: Preserve the accepted mockup visual system: body-only app, no top navigation, no header bar, light shadcn/Tailwind-style dashboard, compact metrics, clean tables, subtle borders, and blue primary actions.
  Rationale: The user accepted this design direction explicitly.
  Date/Author: 2026-06-06 / User and Codex

- Decision: Include custom image prompt and aspect ratio controls in the UI now, but map only supported data to the backend.
  Rationale: The accepted UX needs these controls. Persisting them separately is a backend refinement and should not block the UI. For this implementation, the custom image prompt and aspect ratio are folded into the existing optional campaign instructions sent to Codex.
  Date/Author: 2026-06-06 / Codex

- Decision: Keep image variants capped at `1` or `2` in the UI.
  Rationale: The backend `MAX_IMAGE_VARIANTS` is currently `2`, and the UI should not offer unsupported choices.
  Date/Author: 2026-06-06 / Codex

- Decision: Treat richer product detail fields from the reference as visual direction only for V0.
  Rationale: The current backend does not expose brand, inventory status, month-over-month delta, months of cover, or product thumbnails. The UI will use real fields and simple inferred labels instead of adding backend scope here.
  Date/Author: 2026-06-06 / Codex

- Decision: Keep campaign history rows thumbnail-free unless a full campaign detail is opened.
  Rationale: `GET /api/campaigns?productId=...` returns campaign summary and `imageCount`, not image metadata. Fetching every campaign detail for thumbnails is unnecessary for this demo pass.
  Date/Author: 2026-06-06 / Codex

## Outcomes & Retrospective

Implemented the first real UI workflow:

- seeded login with `demo@promo.test / demo-password`;
- body-only products dashboard with metrics, product sales table, single selection, promotion suggestion action, and disabled/enabled create action;
- promotion suggestions modal backed by `POST /api/campaign-opportunities`, with suggested product rows highlighted and reasoning shown as "Why picked";
- row-level `View recommendation` buttons for suggested products, with popovers that show the AI recommendation, confidence, and `Create campaign`;
- product detail backed by real product fields and `GET /api/campaigns?productId=...`;
- campaign create/view workflow backed by `POST /api/campaigns/generate`, `GET /api/campaigns/[campaignId]`, raw protected image routes, and `POST /api/campaigns/[campaignId]/images/generate`;
- custom image prompt and aspect ratio controls folded into `optionalInstructions` until dedicated backend fields exist.
- loading states for suggestion generation, campaign history, campaign generation, and additional image generation;
- outside-click close behavior for the suggestions popup and recommendation popovers;
- whole-row navigation for product rows and campaign history rows.

Validation passed:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` -> 15 files, 71 tests
- `pnpm build`
- `pnpm db:migrate`
- `pnpm db:seed`
- Codex in-app Browser flow against `CODEX_GATEWAY=fake IMAGE_GENERATION_MODE=fake`
- Codex in-app Browser live smoke against a production server with OpenAI configured and no fake gateway/image flags
- `curl -fsS http://127.0.0.1:3000/api/health`

In-app Browser screenshots were saved under ignored `output/browser-validation/`:

- `01-products-dashboard.png`
- `02-codex-suggestions-popup.png`
- `03-product-detail.png`
- `04-campaign-create-view.png`
- `dashboard-after-polish.png`
- `live-campaign-generated.png`

Remaining known V0 debt:

- `aspectRatio` and `customImagePrompt` are not persisted as first-class campaign fields.
- campaign history shows image counts, not thumbnails, because the summary endpoint does not return image metadata.
- in-app Browser text entry was blocked by the Browser clipboard helper in this session, so custom prompt typing still needs a manual check or a later Browser-tool retry.

## Context and Orientation

Repository root:

    /Users/mahesh/Projects/ecom-promo-codex

Current relevant backend APIs:

- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/products/overview`
- `GET /api/products`
- `POST /api/campaign-opportunities`
- `GET /api/campaigns?productId=<productId>`
- `POST /api/campaigns/generate`
- `GET /api/campaigns/[campaignId]`
- `POST /api/campaigns/[campaignId]/images/generate`
- `GET /api/campaigns/[campaignId]/images/[imageId]`

Accepted visual references:

- `docs/dashboard/products-dashboard-clean.png`
- `docs/dashboard/products-dashboard-codex-popup.png`
- `docs/dashboard/product-detail-campaign-history.png`
- `docs/dashboard/campaign-create-scrollable.png`

Existing older exploratory references may stay in `docs/dashboard/`, but the four files above are the implementation references for this plan.

Terms:

- Products dashboard: the first page with metrics, product sales table, promotion suggestion button, and single product selection.
- Suggestion popup: the modal shown after `Generate Promotion Suggestions`.
- Recommendation popover: the row-level explanation shown from `View recommendation`, with direct `Create campaign` for that suggested product.
- Product detail: product summary plus campaign history for one selected product.
- Campaign create/view: scrollable page where the user enters campaign setup, generates the campaign, then reviews campaign details and images.
- Custom image prompt: optional user-provided image design direction. V0 UI sends it through existing campaign instructions instead of a separate persisted field.

## Milestones

Milestone 1: Lock the UI references and plan.

At the end of this milestone, the four accepted reference images are saved under `docs/dashboard/`, this ExecPlan exists under `docs/exec-plans/active/`, and the plan records how current backend limits affect UI implementation. Validate by checking `find docs/dashboard -maxdepth 1 -type f -name '*.png'` and reading this plan.

Milestone 2: Add the frontend shell and visual system.

At the end of this milestone, the app has a Next root layout, global styles, and a client page that can show a seeded login screen or the app body. The work touches `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, and possibly small frontend helper modules. Validate with `pnpm typecheck`.

Milestone 3: Implement the products dashboard and suggestion popup.

At the end of this milestone, an authenticated user sees product metrics and product rows from the backend, can select one product, can click `Generate Promotion Suggestions`, and sees a popup with returned promotion opportunities. Suggested rows are highlighted, `View recommendation` opens row-level reasoning, and `Create campaign` can be started from the selected product or directly from a recommendation popover. Validate by running the app with fake Codex mode and clicking the dashboard flow in the browser.

Milestone 4: Implement product detail and campaign history.

At the end of this milestone, clicking a product name opens a product detail view with product facts and saved campaign history from `GET /api/campaigns?productId=<productId>`. V0 product detail uses real backend fields plus simple inferred labels, not the richer screenshot-only fields. Campaign history rows show image counts, not thumbnails. Clicking a history row opens campaign view. Validate by creating a campaign, returning to product detail, and seeing it listed.

Milestone 5: Implement campaign create/view.

At the end of this milestone, the campaign page is scrollable and includes discount, quantity limit, variants `1/2`, aspect ratio `Square/Portrait/Landscape`, custom image prompt, campaign instructions, a `Generate` action, campaign details, and a horizontal image strip. Campaign creation calls `POST /api/campaigns/generate`, displays returned details, and renders generated images through the raw image route. `Generate another image` calls the existing additional-image endpoint. Validate by generating a campaign in fake image mode and confirming image tiles load.

Milestone 6: Validate and update evidence.

At the end of this milestone, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass. A local dev server runs, the app is checked through the Codex in-app Browser at desktop size, and screenshots or visual notes compare the implementation against the four accepted references.

## Plan of Work

Start by adding the root app files and global styles. Keep the UI body-only: no global top nav, no user avatar, no marketing hero. Use small reusable React components inside the page file or adjacent modules only if needed.

Implement a thin typed API client in the frontend. It should parse the backend `{ data }` envelope, handle unauthorized responses, and keep error messages user-readable.

Implement the dashboard first. Load session, overview, products, and product campaigns after login. Keep product selection separate from product-name navigation.

Implement promotion suggestions through the existing route. Use loading state, modal popup, suggested row highlights, row-level `View recommendation` popovers, and "Why picked" reasoning. The UI should not show an agent activity console.

Implement product detail next. Use product row data plus `GET /api/campaigns?productId=<productId>` for history.

Implement campaign create/view last. Use local form state for discount, quantity, variants, aspect ratio, custom image prompt, and instructions. When generating, combine campaign instructions, aspect ratio, and custom image prompt into `optionalInstructions` until backend gets dedicated fields. Show returned `campaign`, `images`, and raw image URLs.

## Concrete Steps

1. Confirm clean base:

       cd /Users/mahesh/Projects/ecom-promo-codex
       git status --short

2. Save accepted references in `docs/dashboard/`.

3. Add or update:

       src/app/layout.tsx
       src/app/page.tsx
       src/app/globals.css

4. If adding a frontend dependency is necessary, keep it minimal and record it here. Do not add large UI blocks or unrelated libraries.

5. Run deterministic validation:

       pnpm typecheck
       pnpm lint
       pnpm test
       pnpm build

6. Prepare fresh local demo data when needed:

       pnpm db:migrate
       pnpm db:seed

7. Run local UI validation with fake backends:

       CODEX_GATEWAY=fake IMAGE_GENERATION_MODE=fake pnpm dev

   Then open `http://localhost:3000`, log in with `demo@promo.test / demo-password`, click through the four-screen flow, verify images load, and capture screenshots for the dashboard, suggestion popup, product detail, and campaign create/view states.

## Validation and Acceptance

Acceptance criteria:

- Login works with the seeded demo account.
- Products dashboard matches the accepted body-only dashboard direction.
- `Generate Promotion Suggestions` calls the backend and shows a popup with suggestions.
- Suggested rows are visibly marked and expose `View recommendation`.
- Recommendation popovers show why a product was picked and can start campaign creation.
- Suggestion popup and recommendation popovers close on outside click.
- Product rows and campaign history rows are clickable as full rows.
- Selecting one product enables `Create campaign`.
- Product name opens product detail and campaign history.
- Product detail fetches saved campaigns for that product.
- Campaign create/view page is vertically scrollable and includes campaign details below setup.
- Campaign setup includes discount, quantity limit, variants `1/2`, aspect ratio, custom image prompt, campaign instructions, and `Generate`.
- Campaign generation calls the backend and displays campaign details and images.
- Generated images appear in a horizontally scrollable strip.
- `Generate another image` appends an image through the existing backend route.
- No raw image bytes are embedded in JSON UI state.
- No unsupported image variant count above `2` is exposed.
- No top navigation/header/user avatar is added.

Required commands:

    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm build

Expected: all commands pass.

In-app Browser validation:

    CODEX_GATEWAY=fake IMAGE_GENERATION_MODE=fake pnpm dev

Expected: the app is usable at `http://localhost:3000`; the core flow works without live OpenAI calls. Capture screenshots for the four accepted states and compare them against the corresponding references in `docs/dashboard/`.

## Idempotence and Recovery

The UI can be rerun safely. Fake Codex and fake image generation may create campaign rows in the configured local database when the user clicks `Generate`; that is acceptable demo data.

If the app is already signed in, the dashboard should load directly. If session expires, the login screen should return.

If a backend call fails, the UI should show an error message and keep the current page state.

If generated images fail to load in the browser, verify that the raw image route is protected by the same session cookie and that the campaign belongs to the current user.

Do not commit `.env`, `data/`, `.next/`, or `output/`.

## Artifacts and Notes

Reference images saved for this plan:

- `docs/dashboard/products-dashboard-clean.png`
- `docs/dashboard/products-dashboard-codex-popup.png`
- `docs/dashboard/product-detail-campaign-history.png`
- `docs/dashboard/campaign-create-scrollable.png`

The latest campaign create reference intentionally shows a scrollable page and a horizontal image strip. The UI should keep variants capped at `2` even if a concept image visually hints at more.

## Interfaces and Dependencies

Backend request contracts used by this UI:

    POST /api/campaigns/generate
    {
      "productId": "...",
      "discountPercent": 15,
      "quantityLimit": 50,
      "imageVariants": 1,
      "optionalInstructions": "..."
    }

The UI response handling expects:

    {
      "data": {
        "campaign": { "...": "campaign fields" },
        "images": [{ "...": "image metadata" }]
      }
    }

Additional image generation:

    POST /api/campaigns/<campaignId>/images/generate
    {
      "variants": 1
    }

Raw image display:

    /api/campaigns/<campaignId>/images/<imageId>

Potential future backend refinement:

- persist `aspectRatio`;
- persist `customImagePrompt`;
- let additional image generation accept a custom prompt override.
