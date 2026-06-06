# Promo Campaign MCP Contract

Codex should feel agentic without getting unsafe or overbuilt.

The app gives Codex read-only access to campaign/product context through a tiny MCP server called `promo-campaign-mcp`. Codex decides what to inspect and which products deserve campaign attention. The backend validates and persists the final result.

## Tool Boundary

MCP tools must be read-only for opportunity discovery.

Codex can:

- inspect products;
- inspect dated sales records;
- request safe summary views;
- request campaign context for a selected product.

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

### `find_campaign_opportunities`

Returns candidate products that may need campaign attention.

Input:

```text
limit
```

Output:

```text
opportunities:
  - productId
    signalSummary
    recentSalesSummary
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
```

## Opportunity Discovery Output

When Codex finds campaign opportunities, it should return structured output:

```text
opportunities:
  - productId
    signalSummary
    reasoning
```

The UI highlights those products. Opportunity results do not need their own persistent table.

## Campaign Generation Output

When Codex generates the Instagram campaign, it should return structured output:

```text
instagramCaption
imagePrompt
reasoning
```

The backend saves this as a campaign. The saved `imagePrompt` is used by the image generation step.

## Future MCP Expansion

V0 keeps MCP read-only. A later version can expose more app actions through MCP so Codex App can use the same workflow directly, including image-related actions if that becomes useful. V0 should not expand MCP beyond campaign context.

## Why No Raw SQL Tool In V0

Raw SQL is flexible, but it adds validation and safety work that the demo does not need. The MCP server should expose small business-level tools instead of a generic SQL runner. This keeps the demo easier to evaluate and makes the safety boundary easier to explain.
