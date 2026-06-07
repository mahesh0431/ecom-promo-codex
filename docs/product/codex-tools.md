# Promo Campaign MCP Contract

The Codex SDK agent should feel useful without getting unsafe or overbuilt.

The app gives Codex read-only access to campaign/product context through a tiny MCP server called `promo-campaign-mcp`. MCP returns safe facts and summaries. Codex decides what to inspect, which products deserve campaign attention, and why. The backend validates and persists the final result.

When the backend starts Codex through the Codex SDK, the MCP server must receive the same app `DATABASE_URL` as the current request/server process. This keeps Codex's tool context aligned with the database where campaigns are persisted.

## Tool Boundary

MCP tools must be read-only for opportunity discovery.

MCP should not make the final campaign decision. It can return product rows, sales facts, and safe computed summaries, but Codex owns the opportunity selection and reasoning.

Codex can:

- inspect products;
- inspect dated sales records;
- request safe summary views;
- request campaign context for a selected product.
- use user-provided offer terms when generating campaign content.

Codex runs use the backend `OPENAI_API_KEY`. The backend passes that value through the SDK `apiKey` option and does not expose raw secret env vars to the spawned Codex process.

Codex SDK runs default to `gpt-5.5`, low reasoning, disabled web search, an app-owned Codex home at `output/codex-runtime/home`, and an app-owned working directory at `output/codex-runtime/workspace`. Codex may create its own state, system skills, and plugin marketplace cache inside that home; those generated files stay under ignored `output/` instead of `data/` or a developer's personal Codex profile.

Each promotion suggestion or campaign generation request starts a fresh Codex thread for that job while reusing the same app-owned home and workspace. V0 avoids one long-lived app-wide thread so independent jobs do not leak context into each other.

Codex cannot:

- write to the database;
- mutate products or sales records;
- access auth/session tables;
- access secrets;
- call image generation directly;
- save campaign records directly.

## Minimal Tool Set

### `get_campaign_overview`

Returns high-level product and sales metrics for the current demo dataset.

Output includes only:

- total product count;
- total available stock;
- units sold in the current month.

### `list_products_for_campaign_review`

Returns product and sales context that Codex can compare when deciding what needs campaign attention.

Input:

```text
limit
```

Output:

```text
products:
  - productId
    sku
    name
    category
    priceCents
    availableQuantity
    unitsSoldThisMonth
    recentSalesSummary
    signalFacts
```

### `get_product_campaign_context`

Returns campaign-ready context for one product.

Input:

```text
productId
```

Output:

```text
product
availableQuantity
unitsSoldThisMonth
recentSales
recentSalesSummary
signalFacts
```

## Opportunity Discovery Output

When Codex finds campaign opportunities, it should return structured output:

```text
opportunities:
  - productId
    sku
    signalSummary
    reasoning
    recommendedDiscountPercent
    recommendedQuantityLimit
    confidence
```

The UI highlights those products and can prefill the campaign setup with the recommended offer terms. Opportunity results do not need their own persistent table.

This output is produced by Codex, not by the MCP server.

## Campaign Generation Output

When Codex generates promo campaign content, it should return structured output:

```text
instagramCaption
imagePrompt
reasoning
productId
```

The backend passes the selected product context plus user-confirmed offer terms, including discount and quantity limit, into the campaign generation prompt. Codex should reflect those terms in the caption and image prompt.

The backend saves this as a campaign. The saved `imagePrompt` is used for the initial image variants during campaign creation and for later additional image variants.

## Codex App Skill Path

MCP stays read-only for the backend Codex SDK path. The reviewer-facing Codex App workflow uses the repo skill at `.agents/skills/promo-campaign-studio` and calls the app HTTP APIs directly. This avoids requiring manual MCP setup just to try the skill.

For the Codex App skill, Codex App is the agent. It should read product APIs, decide recommendations from returned product facts, write the campaign caption/image prompt/reasoning itself, and create the saved campaign through `POST /api/campaigns`.

The skill should not call `POST /api/campaign-opportunities` or `POST /api/campaigns/generate`; those routes exist for the in-app UI path where the backend Codex SDK agent is intentionally being demonstrated.

## Why No Raw SQL Tool In V0

Raw SQL is flexible, but it adds validation and safety work that the demo does not need. The MCP server should expose small business-level tools instead of a generic SQL runner. This keeps the demo easier to evaluate and makes the safety boundary easier to explain.

Raw SQL can be reconsidered later if the demo grows, but it is outside V0.
