# Build the Backend Core

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `docs/PLANS.md`.

## Purpose / Big Picture

Build the backend spine for `ecom-promo-codex` before any real UI work begins.

After this plan is complete, the repository has a working API-first backend with local SQLite persistence, seeded demo data, seeded-only authentication, and product/campaign-context APIs that can be validated without a frontend. This gives the later Codex/MCP plan real data and real authenticated API boundaries to use.

This plan intentionally does not build the UI, Codex SDK runner, MCP server, campaign generation, or image generation. Those are later plans. The output here is a backend that can answer: can the app authenticate the seeded demo user and serve product/sales context from durable local data?

## Progress

- [x] (2026-06-06 10:55Z) [M0] Initial backend-core ExecPlan created.
- [x] (2026-06-06 11:03Z) [M1] Scaffolded API-first Next.js/TypeScript foundation, health route, env examples, lint/typecheck/test/build config, and baseline tests.
- [x] (2026-06-06 11:12Z) [M2] Added Prisma 7 SQLite schema, generated client, migration, deterministic seed data, and seed verification script.
- [x] (2026-06-06 11:13Z) [M3] Added reusable product overview/listing and campaign-context services with service tests.
- [x] (2026-06-06 11:13Z) [M4] Added seeded-only auth service, scrypt password verification, SHA-256 session hashing, HTTP-only cookie handling, and auth routes.
- [x] (2026-06-06 11:15Z) [M5] Added protected product route handlers, README backend commands, automated validation, and manual curl validation evidence.

## Surprises & Discoveries

- Observation: The current working tree already has uncommitted doc updates that clarify seeded-only auth and Codex/MCP ownership.
  Evidence: `git status --short --branch` shows modified docs and new `docs/auth.md`.

- Observation: A fresh sub-agent review found the first draft was not deterministic enough around validation order, test database isolation, schema/API contracts, auth crypto, dependency versions, and seed data.
  Evidence: Review returned on 2026-06-06 before implementation.

- Observation: Prisma 7 with SQLite requires an explicit driver adapter at runtime and a generated client import path.
  Evidence: Context7 Prisma 7 docs showed `PrismaBetterSqlite3` adapter usage and generated-client imports; implementation uses `@prisma/adapter-better-sqlite3` and `src/generated/prisma`.

- Observation: The plan's `DATABASE_URL="file:../data/dev.sqlite"` is schema-relative wording, while Prisma 7 config resolves SQLite URLs from `prisma.config.ts`.
  Evidence: `prisma.config.ts` and `src/server/env.ts` normalize `file:../data/...` to `file:./data/...` so the database lands in repo-local `data/`.

- Observation: `pnpm db:migrate -- --name init` passed a literal `--` to Prisma under pnpm 10.
  Evidence: The first command ran as `prisma migrate dev "--" "--name" "init"` and failed. `scripts/migrate.ts` now strips separator args so the documented command works.

- Observation: Prisma 7.8.0 on this machine intermittently returned a blank `Schema engine error` for SQLite migrate/db-push unless schema-engine/Rust logging env vars were set.
  Evidence: `PRISMA_SCHEMA_ENGINE_LOG_LEVEL=trace RUST_LOG=trace pnpm prisma migrate dev --name init` created and applied `20260606111157_init`; the wrapper and test setup set those env vars.

- Observation: TypeScript 6 reports `baseUrl` as deprecated unless the project opts into the current deprecation window.
  Evidence: `pnpm typecheck` failed with TS5101 before `ignoreDeprecations: "6.0"` was added.

## Decision Log

- Decision: Build backend first and defer all real UI work.
  Rationale: The demo value depends on a real backend workflow and Codex integration. UI can consume the backend later after behavior is stable.
  Date/Author: 2026-06-06 / Codex

- Decision: Use Next.js route handlers for the HTTP API, but do not build UI screens in this plan.
  Rationale: The architecture already points to Next.js App Router. Route handlers let the backend and future UI live in one app without creating a separate Express service.
  Date/Author: 2026-06-06 / Codex

- Decision: Use Prisma with SQLite for V0 persistence.
  Rationale: This matches the docs, keeps the demo local and reproducible, and gives a clear ORM boundary for replacing SQLite later.
  Date/Author: 2026-06-06 / Codex

- Decision: Implement seeded-only auth with a small server-owned session layer instead of adding signup or full account management.
  Rationale: V0 needs authentication proof, not identity-product scope. The seed creates the one demo user, and the backend issues an HTTP-only session cookie after password verification.
  Date/Author: 2026-06-06 / Codex

- Decision: Use relative seed dates for product sales.
  Rationale: The demo depends on "sold this month" metrics. Relative seed dates keep the demo useful regardless of when it is run.
  Date/Author: 2026-06-06 / Codex

- Decision: Keep automated tests isolated from the demo database.
  Rationale: Tests should not mutate `data/dev.sqlite` or depend on a previous local seed. Test setup will use `DATABASE_URL=file:../data/test.sqlite`, reset that database, run migrations, and seed synthetic/demo data before DB-dependent tests.
  Date/Author: 2026-06-06 / Codex

- Decision: Use Node built-in `crypto.scrypt` for password hashing and SHA-256 for session token hashes.
  Rationale: This avoids adding an auth dependency while still being explicit and safe enough for a seeded local demo. Password hashes use `scrypt$<salt>$<derivedKey>` and verification uses constant-time comparison. Session raw tokens use at least 32 random bytes encoded as base64url; only SHA-256 hashes are stored.
  Date/Author: 2026-06-06 / Codex

- Decision: Pin major runtime and package expectations in `package.json`.
  Rationale: The repo should be reproducible for an agent and for public users. Use Node 20 or newer, pnpm 10, Next 16, React 19, Prisma 7, Vitest 4, and TypeScript 6.
  Date/Author: 2026-06-06 / Codex

- Decision: Add `@prisma/adapter-better-sqlite3` and allow the native build scripts pnpm blocked.
  Rationale: Prisma 7 requires a driver adapter for SQLite runtime access. Without allowing `better-sqlite3` builds, local DB access can fail after install.
  Date/Author: 2026-06-06 / Codex

- Decision: Use a tiny `scripts/migrate.ts` wrapper for `db:migrate`.
  Rationale: It preserves the documented validation command while absorbing pnpm's literal `--` forwarding and the Prisma SQLite schema-engine env workaround.
  Date/Author: 2026-06-06 / Codex

## Outcomes & Retrospective

Completed on 2026-06-06.

Implemented backend-first Next.js route handlers, Prisma 7 with SQLite, deterministic seeded catalog/sales data, seeded-only auth, protected product APIs, service-level tests, README setup commands, and manual curl validation. No UI screens, Codex SDK runner, MCP server, campaign generation, or image generation were implemented.

Validation evidence:

    pnpm prisma:generate
    Result: Generated Prisma Client (7.8.0) to ./src/generated/prisma.

    pnpm db:seed
    Result: seeded user: demo@promo.test; seeded products: 10.

    pnpm db:verify
    Result:
    users: 1
    products: 10
    productSales: 40
    campaigns: 0
    campaignImages: 0
    unitsSoldThisMonth: 120

    pnpm test
    Result: Test Files 4 passed (4); Tests 8 passed (8).

    pnpm typecheck
    Result: passed.

    pnpm lint
    Result: passed with no warnings after config cleanup.

    pnpm build
    Result: Next.js 16.2.7 compiled successfully and listed only API routes plus _not-found.

Manual API validation evidence:

    curl -s http://localhost:3000/api/health
    Result: {"data":{"status":"ok","service":"ecom-promo-codex"}}

    curl -i http://localhost:3000/api/products/overview
    Result: HTTP/1.1 401 Unauthorized.

    Login with demo@promo.test / demo-password
    Result: HTTP/1.1 200 OK and Set-Cookie: ecom_promo_session=...

    Authenticated GET /api/auth/session
    Result: returned user email demo@promo.test.

    Authenticated GET /api/products/overview
    Result: {"data":{"totalProducts":10,"totalAvailableStock":1075,"unitsSoldThisMonth":120}}

    Authenticated GET /api/products
    Result: returned 10 products; first product was Cold Brew Concentrate with high-stock and low-current-month-sales signal facts.

    Authenticated GET /api/products/<productId>/campaign-context
    Result: returned product, recentSales, recentSalesSummary, and signalFacts.

    POST /api/auth/logout then GET /api/auth/session
    Result: logout returned 200 and the later session check returned 401.

## Context and Orientation

At the start of this plan, the repository was documentation-first and had no application package, runtime dependencies, database schema, or API implementation.

After completion, the repository has a backend-first Next.js application foundation with Prisma/SQLite persistence, seeded-only auth, product/campaign-context services, protected API routes, tests, and backend setup documentation.

Important docs:

- `VISION.md` defines the user-facing flow: seeded sign-in, product metrics/table, Codex campaign opportunity discovery, saved campaign, and later image variants.
- `ARCHITECTURE.md` defines the local-first shape: backend API, seeded demo auth, Prisma, SQLite, Codex SDK runner later, tiny MCP later, and OpenAI image generation later.
- `docs/auth.md` defines seeded-only V0 auth: `demo@promo.test / demo-password`, no signup, no invite, no reset, no user creation flows.
- `docs/data-model.md` defines the local model: user/session ownership, products, dated product sales, campaigns, and campaign images.
- `docs/codex-tools.md` clarifies that MCP returns safe product/sales facts and Codex owns opportunity selection. That later MCP plan should use the services created here.

Terms:

- "Backend core" means the application foundation, persistence, seed data, auth services, and HTTP APIs needed before Codex/MCP and UI work.
- "Seeded-only auth" means the seed script creates the only V0 user. The app supports login/logout/session checks, but not signup or user creation.
- "Campaign context" means product and sales facts that are safe to show to Codex later, such as available quantity, current-month sales, recent sales summaries, and simple signal facts.
- "Current month" means the month containing the server's current date. Seed data must include sales dates relative to the seed run so current-month metrics do not go stale.

## Concrete Contracts

Use these contracts unless implementation discovers a framework constraint that requires a small adjustment. Record any adjustment in `Decision Log`.

Prisma models:

    User
    - id String @id @default(cuid())
    - email String @unique
    - passwordHash String
    - createdAt DateTime @default(now())
    - updatedAt DateTime @updatedAt

    Session
    - id String @id @default(cuid())
    - userId String
    - tokenHash String @unique
    - expiresAt DateTime
    - createdAt DateTime @default(now())
    - user relation to User with cascade delete
    - indexes on userId and expiresAt

    Product
    - id String @id @default(cuid())
    - sku String @unique
    - name String
    - category String
    - priceCents Int
    - availableQuantity Int
    - createdAt DateTime @default(now())
    - updatedAt DateTime @updatedAt

    ProductSale
    - id String @id @default(cuid())
    - productId String
    - saleDate DateTime
    - unitsSold Int
    - createdAt DateTime @default(now())
    - product relation to Product with cascade delete
    - indexes on productId and saleDate

    Campaign
    - id String @id @default(cuid())
    - userId String
    - productId String
    - prompt String
    - optionalInstructions String?
    - instagramCaption String
    - imagePrompt String
    - codexReasoning String
    - createdAt DateTime @default(now())
    - user relation to User
    - product relation to Product
    - indexes on userId, productId, and createdAt

    CampaignImage
    - id String @id @default(cuid())
    - campaignId String
    - prompt String
    - imageData Bytes
    - mimeType String
    - variantIndex Int
    - model String?
    - size String?
    - status String @default("completed")
    - errorMessage String?
    - createdAt DateTime @default(now())
    - campaign relation to Campaign with cascade delete
    - indexes on campaignId and createdAt

HTTP response shape:

    success response:
      { "data": ... }

    error response:
      { "error": { "code": "string", "message": "string" } }

Common error codes:

    UNAUTHORIZED
    INVALID_CREDENTIALS
    VALIDATION_ERROR
    NOT_FOUND
    INTERNAL_ERROR

Route payloads:

    POST /api/auth/login
    request: { "email": "demo@promo.test", "password": "demo-password" }
    200: { "data": { "user": { "id": "...", "email": "demo@promo.test" } } }
    401: { "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password." } }

    GET /api/auth/session
    200: { "data": { "user": { "id": "...", "email": "demo@promo.test" } } }
    401: { "error": { "code": "UNAUTHORIZED", "message": "Authentication required." } }

    POST /api/auth/logout
    200: { "data": { "ok": true } }

    GET /api/products/overview
    200: { "data": { "totalProducts": 10, "totalAvailableStock": 1075, "unitsSoldThisMonth": 120 } }

    GET /api/products
    200: { "data": { "products": [ProductForCampaignReview] } }

    GET /api/products/[productId]/campaign-context
    200: { "data": ProductCampaignContext }
    404: { "error": { "code": "NOT_FOUND", "message": "Product not found." } }

TypeScript shapes:

    ProductForCampaignReview:
      productId: string
      sku: string
      name: string
      category: string
      priceCents: number
      availableQuantity: number
      unitsSoldThisMonth: number
      recentSalesSummary: string
      signalFacts: string[]

    ProductCampaignContext:
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

Seeded products:

    SKU-COF-COLD-001 | Cold Brew Concentrate | Grocery | 1299 | qty 180 | low current-month sales
    SKU-TEA-MATCHA-002 | Ceremonial Matcha Tin | Grocery | 2499 | qty 95 | healthy sales
    SKU-SKN-SERUM-003 | Vitamin C Serum | Beauty | 1899 | qty 140 | low current-month sales
    SKU-SKN-MOIST-004 | Daily Gel Moisturizer | Beauty | 1599 | qty 75 | healthy sales
    SKU-HOM-CANDLE-005 | Amber Soy Candle | Home | 2199 | qty 160 | low current-month sales
    SKU-HOM-TOWEL-006 | Waffle Hand Towel Set | Home | 2799 | qty 60 | healthy sales
    SKU-FIT-BAND-007 | Resistance Band Kit | Fitness | 1999 | qty 110 | moderate sales
    SKU-FIT-BOTTLE-008 | Insulated Training Bottle | Fitness | 1799 | qty 45 | healthy sales
    SKU-PET-TREAT-009 | Salmon Training Treats | Pet | 999 | qty 125 | low current-month sales
    SKU-PET-BED-010 | Washable Pet Bed | Pet | 3499 | qty 85 | low current-month sales

Signal threshold for service tests:

    high stock means availableQuantity >= 100
    low current-month sales means unitsSoldThisMonth <= 5
    signalFacts should include plain facts such as "High stock: 180 units available" and "Low current-month sales: 3 units sold"

## Milestones

Milestone 1: Scaffold the API-first application foundation.

At the end of this milestone, the repo has a working TypeScript/Next.js backend skeleton without real UI screens. The work touches `package.json`, TypeScript config, Next config, test config, `.gitignore`, `.env.example`, `src/server/`, and `src/app/api/health/route.ts`. To validate it, run `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm dev`, then request `GET /api/health`. The expected result is a JSON health response and passing baseline checks.

Milestone 2: Add Prisma, SQLite schema, seed data, and seed verification.

At the end of this milestone, `pnpm db:seed` creates a local SQLite database with one seeded demo user, the exact seeded products listed in this plan, dated product sales, and empty campaign/image tables ready for later plans. The work touches `prisma/schema.prisma`, `prisma/seed.ts`, Prisma client setup, `data/` ignore rules, and seed verification scripts/tests. To validate it, run `pnpm db:migrate -- --name init`, `pnpm prisma:generate`, `pnpm db:seed`, and `pnpm db:verify`. The expected result is a local database with one demo user, ten products, current-month sales rows, and zero generated campaigns/images.

Milestone 3: Add backend services for product overview and campaign context.

At the end of this milestone, server-side services can compute product overview metrics, product rows, and campaign-ready context from the database without depending on HTTP route code. The work touches `src/server/products/`, `src/server/campaign-context/`, and tests under `tests/`. To validate it, run `pnpm test`. The expected result is direct service tests proving product count, total available stock, current-month units sold, product rows, and per-product campaign context.

Milestone 4: Add seeded-only auth service and auth APIs.

At the end of this milestone, the seeded demo user can log in through the backend, receive an HTTP-only session cookie, check the current session, and log out. The work touches `src/server/auth/`, auth route handlers, cookie/session helpers, and auth tests. To validate it, run `pnpm test`, then manually call login/session/logout endpoints with `curl`. The expected result is successful login for `demo@promo.test / demo-password`, rejected login for bad credentials, a valid session response while the cookie exists, and no session after logout.

Milestone 5: Add protected product APIs, validation commands, and backend run documentation.

At the end of this milestone, authenticated API callers can fetch product overview, product rows, and product campaign context. Unauthenticated callers receive `401` for protected product APIs. The work touches product route handlers, shared API response helpers, README backend setup notes, and tests or manual validation notes. To validate it, run all automated checks, run the app locally, log in with curl, and call the protected product APIs. The expected result is stable JSON responses that a future UI and the later MCP server can consume.

## Plan of Work

Start by adding the application foundation without creating real UI screens. Use `pnpm` scripts for repeatable local commands. Add only backend-first dependencies and leave shadcn/ui, Tailwind styling work, and UI screens for the final UI plan.

Create `package.json` with `engines.node` set to `>=20`, `packageManager` set to the installed pnpm 10 version, and dependency majors aligned to Next 16, React 19, Prisma 7, Vitest 4, and TypeScript 6. If exact latest patch versions differ at implementation time, accept the package manager's resolved patch versions and commit the lockfile.

Add Prisma and define the V0 schema. Include all known V0 tables now so later plans do not need to rework the foundation: `User`, `Session`, `Product`, `ProductSale`, `Campaign`, and `CampaignImage`. It is acceptable for `Campaign` and `CampaignImage` to be unused by API routes in this plan; they exist to align the schema with the documented model.

Implement the seed script as idempotent. It should create or update the demo user and seeded products, replace seeded sales rows for those products, and keep sales dates relative to the seed run. It should not rely on fixed 2026 dates. Use stable SKUs or seed keys so repeated seed runs are safe.

Build backend domain services before route handlers. The product overview service should compute total products, total available stock, and units sold in the current month. The product listing service should return rows suitable for the future first screen. The campaign-context service should return safe facts for one product, including recent sales and signal facts. These services will later be reused by the MCP server.

Implement seeded-only authentication as server-owned code using Node built-in crypto only. Store password hashes as `scrypt$<base64url salt>$<base64url derived key>`, using a 16-byte random salt and a 64-byte derived key. Verify with constant-time comparison. Store session token hashes as SHA-256 hex strings. Send the raw session token only in an HTTP-only cookie. Do not add signup, invite, reset, profile, or user creation APIs.

Add route handlers after services exist. Route handlers should be thin: parse input, call services, map errors to status codes, and return JSON. Do not put business logic directly in routes.

Add tests for service behavior and auth behavior. Tests must use `data/test.sqlite`, not `data/dev.sqlite`. Add a test setup helper that resets the test database, applies the schema, seeds deterministic data, and points Prisma at the test database before DB-dependent tests run. Use API/manual validation for full cookie flows if route testing becomes too heavy, but keep enough automated tests to catch the important logic.

Update README only with backend setup and validation commands that are true after implementation. Do not write fake instructions for behavior that does not exist yet.

## Concrete Steps

1. Inspect current working tree and avoid reverting existing doc changes.

       cd /Users/mahesh/Projects/ecom-promo-codex
       git status --short --branch

   Expected: the branch may be ahead of origin and may include uncommitted doc clarifications. Do not revert them.

2. Create the package foundation.

   If `package.json` does not exist yet, create it manually with the project name, `private: true`, `type: "module"`, `engines.node: ">=20"`, `packageManager: "pnpm@10.x"`, and the scripts listed below before installing packages. Avoid interactive package initialization.

       pnpm add next@^16 react@^19 react-dom@^19 zod@^4 @prisma/client@^7
       pnpm add -D typescript@^6 @types/node @types/react @types/react-dom eslint eslint-config-next vitest@^4 tsx prisma@^7

3. Add scripts to `package.json`.

       dev: next dev
       build: next build
       lint: eslint .
       typecheck: tsc --noEmit
       test: vitest run
       test:watch: vitest
       prisma:generate: prisma generate
       db:migrate: prisma migrate dev
       db:seed: tsx prisma/seed.ts
       db:verify: tsx scripts/verify-seed.ts

4. Add minimal config files.

   Create or update:

       tsconfig.json
       next.config.ts
       vitest.config.ts
       eslint.config.mjs or .eslintrc.json
       .env.example
       .gitignore
       data/

   `.env.example` should include:

       DATABASE_URL="file:../data/dev.sqlite"
       SESSION_COOKIE_NAME="ecom_promo_session"
       SESSION_TTL_DAYS="7"

   `.env.test.example` should include:

       DATABASE_URL="file:../data/test.sqlite"
       SESSION_COOKIE_NAME="ecom_promo_test_session"
       SESSION_TTL_DAYS="7"

   `.gitignore` should include:

       .env
       .env.local
       data/*.sqlite
       data/*.sqlite-journal
       data/*.sqlite-wal
       data/*.sqlite-shm
       data/*.db
       node_modules
       .next
       coverage

5. Add a backend health route.

   Create:

       src/app/api/health/route.ts
       src/server/env.ts

   `GET /api/health` should return JSON with at least:

       status: "ok"
       service: "ecom-promo-codex"

6. Add Prisma schema.

   Create:

       prisma/schema.prisma
       src/server/db/client.ts

   Define:

       User
       Session
       Product
       ProductSale
       Campaign
       CampaignImage

   Use cents for money, for example `priceCents`, rather than floating point price. Keep IDs as strings. Add useful indexes on `email`, `sku`, `productId`, `saleDate`, `campaignId`, and `expiresAt`.

7. Add seed data.

   Create:

       prisma/seed.ts
       scripts/verify-seed.ts

   Seed:

       one user: demo@promo.test / demo-password
       the ten seeded products listed in Concrete Contracts
       dated sales rows covering the current month and recent prior dates
       at least four products with high stock and low recent sales
       zero campaign rows by default
       zero campaign image rows by default

   `pnpm db:verify` should print concise counts and a few key metrics:

       users: 1
       products: <count>
       productSales: <count>
       campaigns: 0
       campaignImages: 0
       unitsSoldThisMonth: <non-zero number>

8. Add product and campaign-context services.

   Create:

       src/server/products/product-service.ts
       src/server/products/product-types.ts
       src/server/campaign-context/campaign-context-service.ts
       src/server/campaign-context/campaign-context-types.ts

   Service outputs should include:

       getProductOverview()
       listProductsForCampaignReview()
       getProductCampaignContext(productId)

   The campaign context output should include safe facts, not a final Codex decision:

       product
       availableQuantity
       unitsSoldThisMonth
       recentSales
       recentSalesSummary
       signalFacts

9. Add seeded-only auth services.

   Create:

       src/server/auth/password.ts
       src/server/auth/session-service.ts
       src/server/auth/auth-service.ts
       src/server/auth/auth-types.ts
       src/server/http/cookies.ts
       src/server/http/api-response.ts

   Implement:

       verifyPassword(email, password)
       createSession(userId)
       getSession(rawCookieToken)
       destroySession(rawCookieToken)
       requireSession(request)

   Password hashing should be deterministic for verification but salted per user. Session cookies should be HTTP-only, SameSite=Lax, path `/`, and secure only when `NODE_ENV=production`.

10. Add auth route handlers.

   Create:

       src/app/api/auth/login/route.ts
       src/app/api/auth/logout/route.ts
       src/app/api/auth/session/route.ts

   Expected behavior:

       POST /api/auth/login with valid credentials returns 200 and sets cookie.
       POST /api/auth/login with bad credentials returns 401.
       GET /api/auth/session with valid cookie returns authenticated user.
       GET /api/auth/session without valid cookie returns 401.
       POST /api/auth/logout clears the session cookie and deletes the session.

11. Add protected product route handlers.

   Create:

       src/app/api/products/overview/route.ts
       src/app/api/products/route.ts
       src/app/api/products/[productId]/campaign-context/route.ts

   Expected behavior:

       unauthenticated requests return 401
       authenticated requests return JSON
       missing product returns 404
       route code delegates to services

12. Add tests.

   Create tests under:

       tests/server/
       tests/setup/

   Cover:

       env parsing
       test database reset and seed setup
       seed helper idempotence where practical
       current-month sales calculation
       product overview service
       product campaign context service
       password hash/verify
       session create/get/destroy
       invalid login path

   Prefer service-level tests for fast feedback. Add route tests only where they stay simple.

13. Update docs only where implementation makes commands real.

   Update:

       README.md

   Add backend setup and validation commands:

       pnpm install
       test -f .env || cp .env.example .env
       test -f .env.test || cp .env.test.example .env.test
       mkdir -p data
       pnpm db:migrate -- --name init
       pnpm prisma:generate
       pnpm db:seed
       pnpm db:verify
       pnpm test
       pnpm dev

   Do not add UI screenshots or UI instructions in this plan.

## Validation and Acceptance

Automated validation must pass:

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

    typecheck passes
    lint passes
    tests pass
    migration creates SQLite schema
    seed creates one demo user and seeded product/sales data
    verify prints non-zero product and sales counts
    build passes

Manual API validation:

    pnpm dev

In another terminal:

    curl -s http://localhost:3000/api/health

Expected JSON includes:

    "status":"ok"

Unauthenticated product request:

    curl -i http://localhost:3000/api/products/overview

Expected:

    HTTP/1.1 401

Login:

    curl -i -c /tmp/ecom-promo-cookies.txt \
      -H "Content-Type: application/json" \
      -d '{"email":"demo@promo.test","password":"demo-password"}' \
      http://localhost:3000/api/auth/login

Expected:

    HTTP/1.1 200
    Set-Cookie: ecom_promo_session=...

Session:

    curl -s -b /tmp/ecom-promo-cookies.txt \
      http://localhost:3000/api/auth/session

Expected JSON includes:

    "email":"demo@promo.test"

Product overview:

    curl -s -b /tmp/ecom-promo-cookies.txt \
      http://localhost:3000/api/products/overview

Expected JSON includes:

    totalProducts
    totalAvailableStock
    unitsSoldThisMonth

Product list:

    curl -s -b /tmp/ecom-promo-cookies.txt \
      http://localhost:3000/api/products

Expected JSON includes an array of products with:

    productId
    name
    category
    priceCents
    availableQuantity
    unitsSoldThisMonth
    signalFacts

Campaign context:

    curl -s -b /tmp/ecom-promo-cookies.txt \
      http://localhost:3000/api/products/<productId>/campaign-context

Expected JSON includes:

    product
    recentSales
    recentSalesSummary
    signalFacts

Logout:

    curl -i -b /tmp/ecom-promo-cookies.txt -c /tmp/ecom-promo-cookies.txt \
      -X POST http://localhost:3000/api/auth/logout

Expected:

    HTTP/1.1 200

After logout, `GET /api/auth/session` with the same cookie file returns `401`.

Acceptance criteria:

- No real UI screens are introduced.
- No signup, invite, password reset, profile, or user creation API exists.
- Seeded login works with `demo@promo.test / demo-password`.
- Product overview and campaign-context APIs require authentication.
- Current-month sales are non-zero after seeding.
- Automated tests use `data/test.sqlite` and do not mutate `data/dev.sqlite`.
- Product and sales services are reusable by the later MCP server.
- SQLite database and `.env` files are ignored by git.
- README backend commands match commands that actually work.

## Idempotence and Recovery

The seed script must be safe to rerun. It should use stable seed keys such as user email and product SKU. It may delete and recreate seeded `ProductSale` rows for seeded products, but it must not delete unrelated future campaign data unless the command explicitly says it resets demo data.

Database migrations should be created through Prisma. If a migration fails during early implementation, inspect the database and migration files before deleting anything. Local generated SQLite databases are disposable during this backend foundation stage, but destructive cleanup commands must be explicit.

If `pnpm install` or package resolution fails, record the exact error in `Surprises & Discoveries` and choose the smallest dependency adjustment. Do not switch frameworks just to bypass a transient install issue.

If Next.js route testing becomes awkward, keep route-level manual validation and move automated coverage to service-level tests. Do not create a large test harness just to test simple route wrappers.

If auth implementation begins growing into full account management, stop and bring it back to seeded-only login.

## Artifacts and Notes

Expected new generated-local artifacts:

    data/dev.sqlite
    data/dev.sqlite-journal
    data/test.sqlite
    data/test.sqlite-journal
    data/*.sqlite-wal
    data/*.sqlite-shm
    .env
    .env.test
    .next/
    node_modules/
    coverage/
    src/generated/
    tsconfig.tsbuildinfo

These must not be committed.

Expected committed artifacts:

    package.json
    pnpm-lock.yaml
    tsconfig.json
    next.config.ts
    vitest.config.ts
    eslint config
    .env.example
    .gitignore
    prisma/schema.prisma
    prisma/seed.ts
    scripts/verify-seed.ts
    src/app/api/health/route.ts
    src/app/api/auth/login/route.ts
    src/app/api/auth/logout/route.ts
    src/app/api/auth/session/route.ts
    src/app/api/products/overview/route.ts
    src/app/api/products/route.ts
    src/app/api/products/[productId]/campaign-context/route.ts
    src/server/
    tests/server/
    README.md

Evidence to capture during implementation:

    output of pnpm db:verify
    output of pnpm test
    output of pnpm build
    curl transcript for login/session/product overview

## Interfaces and Dependencies

Runtime dependencies:

    next
    react
    react-dom
    zod
    @prisma/client

Development dependencies:

    typescript
    @types/node
    @types/react
    @types/react-dom
    eslint
    eslint-config-next
    vitest
    tsx
    prisma

Environment variables:

    DATABASE_URL
    SESSION_COOKIE_NAME
    SESSION_TTL_DAYS

Database tables:

    User
    Session
    Product
    ProductSale
    Campaign
    CampaignImage

Backend service interfaces:

    getProductOverview()
    listProductsForCampaignReview()
    getProductCampaignContext(productId)
    loginWithPassword(email, password)
    createSession(userId)
    getSession(rawToken)
    destroySession(rawToken)
    requireSession(request)

HTTP API:

    GET /api/health
    POST /api/auth/login
    POST /api/auth/logout
    GET /api/auth/session
    GET /api/products/overview
    GET /api/products
    GET /api/products/[productId]/campaign-context

The later Codex/MCP plan should reuse the product and campaign-context services created here rather than querying Prisma directly from MCP tool handlers.
