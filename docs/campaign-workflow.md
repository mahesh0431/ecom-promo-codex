# Campaign Workflow

The product workflow is focused on finding products that need campaign attention and generating a simple Instagram campaign.

## Campaign Opportunities

The first screen shows a compact product and sales overview.

Top metrics:

- total products;
- units sold this month;
- available stock.

Below the metrics, show a product table:

```text
Product | Category | Price | Available Qty | Sold This Month | Signal | Action
```

Primary action:

```text
Find Campaign Opportunities
```

When the user clicks the button:

1. Codex uses the small read-only MCP server to inspect product and sales context.
2. Codex identifies the top products that need campaign attention.
3. Codex explains the reason for each selected product.
4. The UI highlights the selected products.
5. Each selected product shows an action to create an Instagram campaign.

The goal is not to build a complex analytics dashboard. The goal is to show Codex using real data to decide what deserves a campaign.

The first screen can also show a small `Recent Campaigns` section with the latest saved campaigns. This proves persistence without creating a full run-history system.

## Instagram Campaign Generator

The second screen is split into three simple blocks.

### Product Context

Show:

- product name;
- category;
- price;
- available quantity;
- sold this month;
- why Codex selected it.

### Prompt

Show:

- a default campaign prompt based on the product context;
- an optional instructions input;
- a `Generate Instagram Campaign` button.

The user can adjust the instruction text and regenerate.

### Campaign Preview

Show:

- Instagram caption;
- image prompt;
- generated image variants on the campaign detail view.

Keep this simple. The current workflow should stay focused on campaign generation and image creation.

## Workflow Story

```text
Product and sales data
  -> promo-campaign-mcp exposes safe read-only context
  -> Codex finds campaign opportunities
  -> user selects a product
  -> Codex generates Instagram content and image prompts
  -> app saves and displays the campaign
  -> image generation creates and saves image variants
  -> recent campaigns shows the saved result
```
