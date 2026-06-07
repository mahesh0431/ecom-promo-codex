# Build the Codex Campaign Engine

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `docs/PLAN.md`.

## Purpose / Big Picture

Build the Codex-powered campaign engine on top of the completed backend core.

After this plan is complete, the app can run Codex from the backend, expose product and sales context to Codex through a tiny read-only MCP server, ask Codex to select campaign opportunities, ask Codex to generate an Instagram caption plus image prompt for a selected product, and persist the generated campaign.

This plan intentionally does not build image generation, generated image persistence, voice, Codex App skill integration, or real UI screens. The output here is a backend that proves the interview-critical behavior: Codex SDK is not decorative; it is the agentic layer that inspects real app context through MCP and produces campaign decisions/content that the backend validates and saves.

## Progress

- [x] (2026-06-06 11:25Z) [M0] Initial Codex Campaign Engine ExecPlan created.
- [x] (2026-06-06 11:35Z) [M0] Fresh sub-agent review completed and plan updated for MCP wiring, gateway selection, live smoke proof, and local config safety.
- [x] (2026-06-06 11:49Z) [M1] Added Codex SDK/MCP dependencies, scripts, schemas, DTO contracts, and type contracts.
- [x] (2026-06-06 11:49Z) [M2] Implemented read-only `promo-campaign-mcp` server over product and campaign-context services.
- [x] (2026-06-06 11:49Z) [M3] Implemented fake and SDK Codex gateways plus live smoke path.
- [x] (2026-06-06 11:49Z) [M4] Added authenticated opportunity-discovery API using validated Codex output.
- [x] (2026-06-06 11:49Z) [M5] Added campaign-generation API, campaign persistence, and campaign list/detail APIs.
- [x] (2026-06-06 11:49Z) [M6] Ran automated validation and live Codex SDK/MCP validation evidence.

## Surprises & Discoveries

- Observation: The backend core plan is complete and committed as `84f2863 feat: add backend core foundation`.
  Evidence: `git log -2 --oneline` shows `84f2863` after `7ca8186`.

- Observation: Current official Codex documentation says Codex supports MCP configuration through `config.toml`, and the TypeScript SDK can control Codex server-side with `Codex`, `startThread`, and `run`.
  Evidence: Fresh Codex manual fetched on 2026-06-06 from `developers.openai.com`; relevant sections were Codex SDK and Model Context Protocol.

- Observation: Current npm versions checked before authoring this plan were `@openai/codex-sdk@0.137.0`, `@modelcontextprotocol/sdk@1.29.0`, and `zod-to-json-schema@3.25.2`.
  Evidence: `npm view` commands run on 2026-06-06.

- Observation: Fresh sub-agent review found the plan implementable and demo-scoped, but too vague around Codex/MCP runtime wiring, fake-vs-real gateway selection, event-level MCP proof, and project `.codex/config.toml` safety.
  Evidence: Sub-agent review completed on 2026-06-06 before implementation.

- Observation: `zod-to-json-schema@3.25.2` produced an invalid `type: "None"` schema when used with this repo's Zod 4 schemas.
  Evidence: First live `RUN_CODEX_LIVE=1 pnpm codex:smoke` failed with OpenAI `invalid_json_schema`; SDK gateway now uses Zod 4 `z.toJSONSchema()`, and `zod-to-json-schema` was removed.

- Observation: MCP calls were cancelled in non-interactive live smoke when MCP tools used `default_tools_approval_mode: "auto"`.
  Evidence: Live smoke captured failed MCP calls with `errorMessage: "user cancelled MCP tool call"`; explicit per-tool `approval_mode: "approve"` fixed the live path.

- Observation: Live Codex SDK smoke passed in `read-only` sandbox with completed `promo-campaign-mcp` calls.
  Evidence: `RUN_CODEX_LIVE=1 pnpm codex:smoke` returned seeded product opportunities including `SKU-COF-COLD-001`, generated one campaign payload, and captured completed MCP calls for `get_campaign_overview`, `list_products_for_campaign_review`, and `get_product_campaign_context`.

## Decision Log

- Decision: Plan 2 proves Codex SDK plus MCP before image generation or UI work.
  Rationale: The interview value depends on Codex visibly owning opportunity reasoning and campaign generation. Images and UI can consume saved campaign outputs later.
  Date/Author: 2026-06-06 / Codex

- Decision: MCP remains read-only and exposes facts, not final campaign decisions.
  Rationale: This keeps the safety boundary explainable. MCP returns product/sales context; Codex chooses opportunities and writes no database records directly.
  Date/Author: 2026-06-06 / Codex

- Decision: Backend persists Codex outputs only after Zod validation.
  Rationale: Codex output is untrusted until parsed and validated. The backend owns database writes.
  Date/Author: 2026-06-06 / Codex

- Decision: Automated tests use a fake Codex gateway; live Codex SDK validation is a separate explicit smoke path.
  Rationale: Tests should be deterministic and not require OpenAI/Codex auth. The demo still needs one manual/live validation path to prove the real Codex integration.
  Date/Author: 2026-06-06 / Codex

- Decision: First try to run Codex in `read-only` sandbox mode with MCP access; if SQLite/MCP access fails under read-only sandbox, record the failure and use `workspace-write` only with post-run checks that confirm no source files changed.
  Rationale: The backend needs Codex to inspect context, not edit files. Read-only is the better boundary, but local MCP/SQLite may require pragmatic adjustment.
  Date/Author: 2026-06-06 / Codex

- Decision: Runtime API routes use a real SDK gateway by default, tests inject or select a fake gateway explicitly, and smoke validation always uses the real SDK gateway.
  Rationale: The demo should not silently become fake-only, but automated tests must remain deterministic and credential-free.
  Date/Author: 2026-06-06 / Codex

- Decision: The live smoke must prove both opportunity discovery and campaign generation through Codex SDK and MCP, and must capture evidence that Codex actually called at least one `promo-campaign-mcp` tool.
  Rationale: Valid JSON with seeded product IDs is not enough proof that Codex used MCP.
  Date/Author: 2026-06-06 / Codex

- Decision: Use SDK `config` overrides for the local MCP server and explicitly approve only the three read-only promo MCP tools.
  Rationale: This avoids committed local `.codex/config.toml` state and makes non-interactive smoke validation work without broad tool permission.
  Date/Author: 2026-06-06 / Codex

## Outcomes & Retrospective

Completed on 2026-06-06.

Implemented:

- `@openai/codex-sdk` and `@modelcontextprotocol/sdk` dependencies.
- `promo-campaign-mcp` stdio server with three read-only tools.
- Zod schemas and DTO contracts for Codex output, MCP payloads, and campaign APIs.
- Fake Codex gateway for deterministic tests and SDK Codex gateway for runtime/live smoke.
- `POST /api/campaign-opportunities`.
- `POST /api/campaigns/generate`.
- `GET /api/campaigns`.
- `GET /api/campaigns/[campaignId]`.
- `scripts/codex-smoke.ts`.
- README backend validation notes.

Validation evidence:

- `pnpm db:verify` passed: users 1, products 10, productSales 40, campaigns 0, campaignImages 0, unitsSoldThisMonth 120.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed: 8 files, 29 tests.
- `pnpm build` passed and listed all campaign API routes.
- `pnpm codex:smoke` skipped correctly when `RUN_CODEX_LIVE` is not set.
- `RUN_CODEX_LIVE=1 pnpm codex:smoke` passed in `read-only` sandbox with completed MCP tool-call evidence.

Retrospective:

The implementation stayed inside the backend/Codex/MCP scope. Image generation and UI remain intentionally out of scope for the next plan. The main live-demo risks were real: Zod 4 JSON schema conversion and MCP tool approval. Both are now handled in code and documented here.

## Context and Orientation

The completed backend core already provides:

- seeded-only app auth;
- Prisma/SQLite persistence;
- deterministic products and sales;
- product overview service;
- campaign-context service;
- protected product APIs;
- `Campaign` and `CampaignImage` tables.

Important existing files:

- `src/server/products/product-service.ts` exposes `getProductOverview()` and `listProductsForCampaignReview()`.
- `src/server/campaign-context/campaign-context-service.ts` exposes `getProductCampaignContext(productId)`.
- `src/server/auth/` provides seeded-only sessions.
- `src/server/db/client.ts` provides Prisma access.
- `prisma/schema.prisma` already includes `Campaign`.
- `docs/product/codex-tools.md` defines the MCP boundary.
- `docs/product/campaign-workflow.md` defines the user workflow.
- `ARCHITECTURE.md` defines Codex, MCP, backend, and persistence responsibilities.

Terms:

- "MCP server" means the local `promo-campaign-mcp` process Codex can call for read-only product/sales context.
- "Codex runner" means the server-side wrapper around `@openai/codex-sdk` that starts a thread, prompts Codex, validates output, and returns typed results.
- "Opportunity discovery" means Codex returns a ranked list of product opportunities with reasoning. Opportunity results are not persisted in V0.
- "Campaign generation" means Codex returns an Instagram caption, image prompt, and reasoning for one selected product. The backend persists this as a `Campaign`.
- "Live smoke" means a local validation that uses the real Codex SDK and real MCP server. It should be explicit and skipped unless the developer opts in.

## Concrete Contracts

Dependencies to add:

    @openai/codex-sdk@^0.137
    @modelcontextprotocol/sdk@^1.29

Package scripts to add:

    mcp:promo: tsx src/mcp/promo-campaign-mcp.ts
    codex:smoke: tsx scripts/codex-smoke.ts

MCP server:

    name: promo-campaign-mcp
    transport: stdio
    implementation path: src/mcp/promo-campaign-mcp.ts

MCP server instructions must say, in the first 512 characters:

    This server exposes read-only eCommerce product and sales context for campaign planning. Use it to inspect product metrics, campaign review rows, and campaign context for a selected product. Do not request writes, auth/session data, secrets, image generation, or campaign persistence.

MCP tools:

    get_campaign_overview
    input: {}
    output:
      totalProducts: number
      totalAvailableStock: number
      unitsSoldThisMonth: number

    list_products_for_campaign_review
    input:
      limit?: number
    output:
      products:
        - productId: string
          sku: string
          name: string
          category: string
          priceCents: number
          availableQuantity: number
          unitsSoldThisMonth: number
          recentSalesSummary: string
          signalFacts: string[]

    get_product_campaign_context
    input:
      productId: string
    output:
      product:
        productId: string
        sku: string
        name: string
        category: string
        priceCents: number
      availableQuantity: number
      unitsSoldThisMonth: number
      recentSales:
        - saleDate: string
          unitsSold: number
      recentSalesSummary: string
      signalFacts: string[]

Codex opportunity output schema:

    opportunities:
      - productId: string
        sku: string
        signalSummary: string
        reasoning: string
        confidence: "low" | "medium" | "high"

Rules:

    1 to 3 opportunities.
    Product IDs and SKUs must match products returned by MCP.
    Reasoning must mention concrete facts from MCP output.
    Do not include image prompts or captions in opportunity discovery.

Codex campaign output schema:

    productId: string
    instagramCaption: string
    imagePrompt: string
    reasoning: string

Rules:

    productId must match the requested product.
    instagramCaption should be suitable for Instagram and under 2,200 characters.
    imagePrompt should describe a product-focused promotional image and must not mention implementation details.
    reasoning must mention concrete product/sales facts.

OpportunityDto:

    productId: string
    sku: string
    signalSummary: string
    reasoning: string
    confidence: "low" | "medium" | "high"

HTTP API:

    POST /api/campaign-opportunities
    auth: required
    request: {}
    200:
      { "data": { "opportunities": [Opportunity] } }

    POST /api/campaigns/generate
    auth: required
    request:
      {
        "productId": "string",
        "optionalInstructions": "string | optional"
      }
    201:
      { "data": { "campaign": CampaignDto } }

    GET /api/campaigns
    auth: required
    200:
      { "data": { "campaigns": [CampaignSummaryDto] } }

    GET /api/campaigns/[campaignId]
    auth: required
    200:
      { "data": { "campaign": CampaignDto } }

CampaignDto:

    campaignId: string
    productId: string
    product:
      sku: string
      name: string
      category: string
      priceCents: number
    prompt: string
    optionalInstructions: string | null
    instagramCaption: string
    imagePrompt: string
    codexReasoning: string
    createdAt: string

CampaignSummaryDto:

    campaignId: string
    productId: string
    productName: string
    sku: string
    instagramCaption: string
    imagePrompt: string
    createdAt: string

Error mapping:

    invalid request body -> VALIDATION_ERROR
    missing/invalid session -> UNAUTHORIZED
    missing product or campaign -> NOT_FOUND
    Codex runtime failure -> CODEX_RUNTIME_ERROR
    Codex JSON parse or Zod validation failure -> CODEX_OUTPUT_ERROR

Runtime env additions:

    CODEX_GATEWAY optional, allowed values sdk | fake, default sdk outside tests
    Codex model/reasoning/sandbox use app defaults for smoke validation
    RUN_CODEX_LIVE optional, set to 1 to run live smoke script

No OpenAI image API key is needed in this plan.

Gateway selection contract:

    Tests should pass a fake gateway directly or run with CODEX_GATEWAY=fake.
    Runtime API routes should default to CODEX_GATEWAY=sdk.
    Manual fake API validation is allowed only when explicitly started with CODEX_GATEWAY=fake.
    The live smoke script must ignore fake mode and use the real SDK gateway.

Codex MCP runtime contract:

    server name: promo-campaign-mcp
    command: pnpm
    args: ["exec", "tsx", "src/mcp/promo-campaign-mcp.ts"]
    cwd: /Users/mahesh/Projects/ecom-promo-codex
    enabled: true
    required: true if the active Codex config surface supports it
    enabled_tools:
      - get_campaign_overview
      - list_products_for_campaign_review
      - get_product_campaign_context
    default_tools_approval_mode: auto if the active Codex config surface supports it
    startup_timeout_sec: 20
    tool_timeout_sec: 60

The MCP process must emit no non-MCP text to stdout. Logs, if any, must go to stderr. The `cwd` is required so the existing env loader can read `.env` and resolve the SQLite path correctly.

## Milestones

Milestone 1: Add Codex SDK and MCP dependencies, scripts, and runtime contracts.

At the end of this milestone, the repo has the required packages, scripts, Zod schemas, and TypeScript contracts for MCP tool payloads, Codex outputs, and campaign DTOs. The work touches `package.json`, lockfile, `src/server/codex/`, `src/server/campaigns/`, and tests for schema validation. To validate it, run `pnpm install`, `pnpm typecheck`, `pnpm lint`, and `pnpm test`. Expected result: contracts compile and schema tests pass without live Codex.

Milestone 2: Implement read-only `promo-campaign-mcp` server over existing backend services.

At the end of this milestone, `pnpm mcp:promo` starts a stdio MCP server exposing only the three read-only tools in this plan. The server should wait for stdio messages by design, so deterministic validation should use handler tests or a small MCP client script instead of treating a long-running process as a failure. The tools reuse existing product and campaign-context services. The work touches `src/mcp/promo-campaign-mcp.ts` and MCP tests or direct tool-handler tests. To validate it without Codex, run a local MCP handler test or script that calls each tool and validates the JSON against schemas. Expected result: overview, product review list, and product context outputs match seeded DB facts.

Milestone 3: Implement Codex runner abstraction with mocked tests and one live smoke path.

At the end of this milestone, backend code can ask a `CodexGateway` for opportunities or campaign content. Tests use a fake gateway through direct injection or `CODEX_GATEWAY=fake`; runtime defaults to the SDK gateway. A live smoke script uses `@openai/codex-sdk`, starts a thread, configures the MCP server, requests structured output for both opportunity discovery and campaign generation, validates both, and captures evidence that Codex called `promo-campaign-mcp`. The work touches `src/server/codex/`, `scripts/codex-smoke.ts`, and tests. To validate deterministically, run tests. To validate live, run `RUN_CODEX_LIVE=1 pnpm codex:smoke` after confirming `OPENAI_API_KEY` is configured. Expected result: fake tests pass, and live smoke either passes or records an auth/runtime blocker in this plan.

Milestone 4: Add opportunity-discovery API using Codex structured output.

At the end of this milestone, authenticated callers can `POST /api/campaign-opportunities` and receive 1 to 3 validated Codex-selected opportunities. The route must not persist opportunity rows. The work touches route handlers, Codex service code, validation schemas, and tests with fake Codex output. To validate it, run automated tests and a manual API call using fake mode or live mode. Expected result: unauthenticated requests return `401`, authenticated requests return product IDs/SKUs that exist in the seeded DB, and reasoning mentions concrete facts.

Milestone 5: Add campaign-generation API, campaign persistence, and basic campaign read APIs.

At the end of this milestone, authenticated callers can generate a campaign for a selected product, the backend validates Codex output, saves a `Campaign` row, and exposes basic campaign list/detail APIs. The work touches campaign services, route handlers, tests, and README docs. To validate it, run automated tests and manually generate one campaign. Expected result: a campaign row exists with caption, image prompt, reasoning, product link, user link, and optional instructions.

Milestone 6: Run automated validation and live/manual Codex validation evidence.

At the end of this milestone, the ExecPlan contains evidence for package install, Prisma generation, seed verification, typecheck, lint, tests, build, manual API checks, and live Codex SDK/MCP smoke if runtime auth is available. If live auth is unavailable, do not pretend it passed; record the exact blocker and keep the plan active until the user decides whether mock-only is acceptable.

## Plan of Work

Start with contracts and dependencies. Add Zod schemas for MCP outputs, Codex opportunity output, Codex campaign output, and campaign API DTOs. These schemas are the boundary between untrusted Codex text and backend persistence.

Build the MCP server as a thin adapter over existing backend services. The MCP server must not query auth/session tables, secrets, image generation, or campaign write APIs. It must not make final opportunity decisions. It only returns overview, product review rows, and campaign context for a selected product.

Build the Codex runner behind an interface so most tests do not need live Codex. Use a fake implementation for route/service tests through dependency injection or explicit `CODEX_GATEWAY=fake` test configuration. Runtime API routes default to the real SDK gateway. The real implementation should use `@openai/codex-sdk` server-side and request structured output. If the SDK returns text, parse JSON and validate with Zod. If the SDK directly supports `outputSchema`, use it and still validate the final result with Zod.

Configure MCP for the Codex SDK in the smallest reproducible way using the contract above. Prefer SDK config overrides and the backend `OPENAI_API_KEY`; do not require users to edit global `~/.codex/config.toml` for the app demo. Record the exact approach in `Decision Log` after the implementation spike.

Use `read-only` sandbox mode for the first live smoke. If the MCP server cannot access SQLite under read-only sandbox, record the evidence, switch to `workspace-write` for this local demo run only, and add a post-run check that `git status --short` has no unexpected file changes after Codex completes.

The live smoke must run both the opportunity and campaign-generation prompts. It should inspect returned SDK items or streamed events using the installed SDK types and assert that at least one MCP tool call targeted `promo-campaign-mcp`. If the exact event shape differs, record the actual field names in this plan rather than weakening the proof.

Add API routes after services exist. Routes should only authenticate, parse input, call campaign/Codex services, and map errors to JSON. Campaign persistence must happen in backend services after Codex output validation.

Do not add image generation. `imagePrompt` is saved as text for Plan 3.

Do not add real UI screens. README may include curl commands for backend validation.

## Concrete Steps

1. Confirm clean backend baseline.

       cd /Users/mahesh/Projects/ecom-promo-codex
       git status --short --branch
       pnpm db:verify
       pnpm test

   Expected: no unrelated app-code changes are present before Plan 2 implementation begins. Commit the accepted planning docs first or consciously carry only those doc changes. Seed verification succeeds, and tests pass.

2. Add dependencies and scripts.

      pnpm add @openai/codex-sdk@^0.137 @modelcontextprotocol/sdk@^1.29

   Add scripts:

       mcp:promo: tsx src/mcp/promo-campaign-mcp.ts
       codex:smoke: tsx scripts/codex-smoke.ts

3. Add Codex and campaign contract files.

   Create:

       src/server/codex/codex-schemas.ts
       src/server/codex/codex-types.ts
       src/server/codex/codex-prompts.ts
       src/server/campaigns/campaign-types.ts
       src/server/campaigns/campaign-schemas.ts

   Include the exact schemas from `Concrete Contracts`.

4. Add MCP server.

   Create:

       src/mcp/promo-campaign-mcp.ts
       src/mcp/tool-handlers.ts
       src/mcp/tool-schemas.ts

   Tool handlers should call:

       getProductOverview()
       listProductsForCampaignReview()
       getProductCampaignContext(productId)

   Tool handlers should return JSON-safe payloads and no auth/session/secrets.

5. Add deterministic MCP tests or handler tests.

   Create:

       tests/server/mcp-tools.test.ts

   Cover:

       get_campaign_overview returns seeded metrics
       list_products_for_campaign_review returns seeded products and signal facts
       get_product_campaign_context returns context for Cold Brew Concentrate
       invalid productId maps to NOT_FOUND-style tool error

6. Add Codex gateway interface and fake gateway.

   Create:

       src/server/codex/codex-gateway.ts
       src/server/codex/fake-codex-gateway.ts
       src/server/codex/sdk-codex-gateway.ts
       src/server/codex/codex-gateway-factory.ts

   Interface:

       findCampaignOpportunities(input): Promise<OpportunityDiscoveryResult>
       generateInstagramCampaign(input): Promise<CampaignGenerationResult>

   Fake gateway should return deterministic output using seeded product facts.
   Gateway factory rules:

       NODE_ENV=test or CODEX_GATEWAY=fake selects fake only when explicitly requested by tests/manual validation
       CODEX_GATEWAY=sdk selects the SDK gateway
       runtime default is sdk
       unknown CODEX_GATEWAY values fail startup/request validation clearly

7. Add real SDK Codex gateway.

   Implement `sdk-codex-gateway.ts` using `@openai/codex-sdk`.

   Requirements:

       run server-side only
       start a Codex thread per request
       configure `promo-campaign-mcp` using the exact runtime contract in this plan, or record the installed SDK-supported equivalent
       request structured JSON output
       parse and validate with Zod
       map parse/validation failures to an app error
       avoid direct DB writes
       record SDK item/event evidence for MCP tool calls in smoke mode

   Prompt requirements:

       For opportunity discovery, tell Codex to use MCP tools to inspect overview and product review rows.
       For campaign generation, tell Codex to use MCP context for the requested product.
       Tell Codex not to edit files, not to write DB records, and not to generate images.

8. Add live smoke script.

   Create:

       scripts/codex-smoke.ts

   Behavior:

       If RUN_CODEX_LIVE is not "1", print a clear skip message and exit 0.
       If RUN_CODEX_LIVE is "1", force the real Codex SDK gateway regardless of CODEX_GATEWAY.
       Run opportunity discovery against real Codex SDK and MCP.
       Pick one returned productId and run campaign generation against real Codex SDK and MCP without persisting.
       Validate both returned outputs with Zod.
       Assert from SDK items or streamed events that at least one MCP tool call targeted `promo-campaign-mcp`.
       Print selected opportunities.
       Print the generated campaign caption/image-prompt summary.
       Record whether sandbox mode was read-only or fallback workspace-write.

9. Add campaign service.

   Create:

       src/server/campaigns/campaign-service.ts

   Functions:

       findCampaignOpportunitiesForUser(userId)
       generateCampaignForUser(input)
       listCampaignsForUser(userId)
       getCampaignForUser(userId, campaignId)

   Persistence rules:

       opportunities are not persisted
       generated campaigns are persisted
       campaign must belong to authenticated user
       productId must exist
       optionalInstructions should be trimmed and capped at 1,000 chars
       saved prompt should include product name, facts, and optional instructions

10. Add campaign API routes.

    Create:

       src/app/api/campaign-opportunities/route.ts
       src/app/api/campaigns/generate/route.ts
       src/app/api/campaigns/route.ts
       src/app/api/campaigns/[campaignId]/route.ts

    Expected behavior:

       unauthenticated requests return 401
       invalid body returns VALIDATION_ERROR
       missing product returns NOT_FOUND
       opportunity route returns no persisted rows
       generate route persists one campaign row
       campaign list/detail only return campaigns owned by the current seeded user

11. Add automated tests.

    Create:

       tests/server/codex-schemas.test.ts
       tests/server/campaign-service.test.ts
       tests/server/campaign-routes.test.ts if route tests stay simple

    Cover:

       valid/invalid Codex opportunity output
       valid/invalid Codex campaign output
       opportunity service uses fake gateway and returns existing product IDs
       campaign generation persists one row
       optional instructions are saved
       unauthenticated campaign APIs reject
       product IDs from fake gateway are validated against DB
       gateway factory defaults to sdk outside tests and rejects unknown CODEX_GATEWAY values
       CODEX_GATEWAY=fake never attempts to start Codex SDK

12. Update docs.

    Update:

       README.md
       docs/product/codex-tools.md if tool names or payloads changed
       this ExecPlan progress/evidence sections

    README should add backend validation commands for:

       CODEX_GATEWAY=fake pnpm dev for deterministic API validation
       CODEX_GATEWAY=sdk pnpm dev for real Codex-backed API validation
       pnpm mcp:promo
       RUN_CODEX_LIVE=1 pnpm codex:smoke
       curl POST /api/campaign-opportunities
       curl POST /api/campaigns/generate

    Do not add UI instructions.

## Validation and Acceptance

Automated validation:

    cd /Users/mahesh/Projects/ecom-promo-codex
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

Expected:

    seed verification still shows 10 products and zero generated images
    typecheck passes
    lint passes
    tests pass without live Codex
    build passes

MCP validation:

    pnpm mcp:promo

Expected:

    server starts over stdio and waits for MCP messages without crashing or printing non-MCP stdout. Because stdio MCP servers normally keep running, use handler tests or a small MCP client script as deterministic proof.

Live Codex smoke:

    RUN_CODEX_LIVE=1 pnpm codex:smoke

Expected if `OPENAI_API_KEY` and Codex runtime access are available:

    Codex uses `promo-campaign-mcp`
    returns 1 to 3 opportunities
    records SDK item/event evidence for at least one MCP tool call
    product IDs/SKUs match seeded products
    opportunity reasoning mentions concrete facts
    generates one non-persisted campaign payload for a selected product
    campaign reasoning mentions concrete facts from `get_product_campaign_context`
    no campaign is persisted by opportunity discovery

If live runtime is unavailable:

    record the exact error in Surprises & Discoveries
    leave the plan active unless the user explicitly accepts mock-only completion

Manual API validation:

    pnpm dev

In another terminal, log in:

    curl -i -c /tmp/ecom-promo-cookies.txt \
      -H "Content-Type: application/json" \
      -d '{"email":"demo@promo.test","password":"demo-password"}' \
      http://localhost:3000/api/auth/login

Discover opportunities:

    curl -s -b /tmp/ecom-promo-cookies.txt \
      -X POST http://localhost:3000/api/campaign-opportunities

Expected:

    data.opportunities is an array of 1 to 3 items
    each item has productId, sku, signalSummary, reasoning, confidence

Generate campaign:

    curl -s -b /tmp/ecom-promo-cookies.txt \
      -H "Content-Type: application/json" \
      -d '{"productId":"<productId>","optionalInstructions":"Keep it warm and premium."}' \
      http://localhost:3000/api/campaigns/generate

Expected:

    HTTP 201
    data.campaign.instagramCaption
    data.campaign.imagePrompt
    data.campaign.codexReasoning
    campaignId

List campaigns:

    curl -s -b /tmp/ecom-promo-cookies.txt \
      http://localhost:3000/api/campaigns

Expected:

    generated campaign appears in the list

Get campaign:

    curl -s -b /tmp/ecom-promo-cookies.txt \
      http://localhost:3000/api/campaigns/<campaignId>

Expected:

    generated campaign detail is returned

Acceptance criteria:

- Codex SDK is installed and used by a real backend runner.
- MCP server exists and exposes only read-only product/sales context.
- MCP server reuses backend services instead of duplicating business logic.
- Runtime API gateway defaults to SDK, while tests use fake gateway explicitly.
- Codex owns opportunity selection and reasoning.
- Live smoke captures evidence that Codex called `promo-campaign-mcp`.
- Opportunity discovery does not persist rows.
- Campaign generation persists a valid `Campaign` row.
- Campaign APIs require authentication.
- Automated tests do not require live Codex.
- Live smoke path exists and either passes or records a concrete runtime-auth blocker.
- No image generation is implemented.
- No real UI screens are implemented.

## Idempotence and Recovery

The MCP server must be safe to run repeatedly. It should not mutate the database.

Opportunity discovery must be safe to run repeatedly. It should not write campaign rows.

Campaign generation intentionally writes a `Campaign` row each time it succeeds. Tests should use the isolated test database.

If Codex SDK API details differ from the docs during implementation, inspect installed TypeScript types and record the final SDK usage in `Decision Log`.

If MCP configuration through SDK overrides is not viable, stop and re-check the current Codex SDK docs before adding any generated Codex config files.

If the real Codex runner returns non-JSON or invalid JSON, improve prompts and output schema handling before weakening validation.

If `OPENAI_API_KEY` is missing, do not fake live success. Keep fake-gateway tests passing, record the blocker, and ask the user whether to configure the key or accept mock-only for now.

If sandbox read-only blocks local SQLite/MCP access, record the exact error and use the smallest sandbox relaxation needed for the local demo. After every live run, check `git status --short` to confirm Codex did not edit source files.

## Artifacts and Notes

Expected committed artifacts:

    package.json
    pnpm-lock.yaml
    .gitignore if project-scoped `.codex/config.toml` fallback is needed
    src/mcp/
    src/server/codex/
    src/server/codex/codex-gateway-factory.ts
    src/server/campaigns/
    src/app/api/campaign-opportunities/route.ts
    src/app/api/campaigns/generate/route.ts
    src/app/api/campaigns/route.ts
    src/app/api/campaigns/[campaignId]/route.ts
    scripts/codex-smoke.ts
    tests/server/mcp-tools.test.ts
    tests/server/codex-schemas.test.ts
    tests/server/campaign-service.test.ts
    README.md
    docs/exec-plans/active/codex-campaign-engine-2026-06-06.md

Expected generated-local artifacts:

    data/dev.sqlite
    data/test.sqlite
    .env
    .env.test
    .next/
    node_modules/
    src/generated/
    tsconfig.tsbuildinfo
    .codex/config.toml if project-scoped Codex config fallback is needed

These generated-local artifacts must not be committed.

Evidence to capture:

    pnpm db:verify output
    pnpm test output
    pnpm build output
    MCP handler/tool test output
    RUN_CODEX_LIVE=1 pnpm codex:smoke output or exact blocker, including MCP tool-call evidence if it runs
    curl transcript for opportunities and campaign generation
    git status after live Codex run

## Interfaces and Dependencies

New runtime dependencies:

    @openai/codex-sdk
    @modelcontextprotocol/sdk

New scripts:

    mcp:promo
    codex:smoke

New backend interfaces:

    CodexGateway
    createCodexGateway()
    findCampaignOpportunities(input)
    generateInstagramCampaign(input)
    findCampaignOpportunitiesForUser(userId)
    generateCampaignForUser(input)
    listCampaignsForUser(userId)
    getCampaignForUser(userId, campaignId)

New HTTP API:

    POST /api/campaign-opportunities
    POST /api/campaigns/generate
    GET /api/campaigns
    GET /api/campaigns/[campaignId]

The next plan, Image Generation + Backend Completion, should consume saved campaign `imagePrompt` values from this plan and add generated image APIs/records.
