# Campaign Workflow

The product workflow is focused on finding products that need promotion attention and creating a small promo campaign with real offer terms.

The app should stay simple. Codex is visible through useful suggestions and generated campaign output, not through an agent activity console.

## Page 1: Products Dashboard

The first screen shows a compact product and sales overview.

Top metrics:

- total products;
- sold this month;
- available stock.

Below the metrics, show a product table:

```text
Select | Product | Category | Price | Available | Sold This Month | Suggested
```

The product name opens the product detail page. Selecting a row chooses one product for campaign creation. Only one product can be selected at a time.

Primary actions:

```text
Generate Promotion Suggestions
Create campaign
```

`Create campaign` is enabled only after one product is selected. It navigates to the campaign create page for that product. It does not generate a campaign on the products page.

When the user clicks `Generate Promotion Suggestions`:

1. Codex uses the small read-only MCP server to inspect product and sales context.
2. Codex identifies the top products that need campaign attention.
3. The UI shows a popup with the shortlisted products and short reasons.
4. The matching table rows are highlighted.
5. Suggested rows show a `View recommendation` button in the `Suggested` column.
6. `View recommendation` opens a small popover with the AI recommendation, confidence, and why the product was picked.
7. The popover includes `Create campaign`, which opens the campaign create page for that product.

The suggestions popup does not include a separate `Use suggestion` action. It can be closed with the close button or by clicking outside the popup. Recommendation popovers can also be closed by clicking outside them.

The goal is not to build a complex analytics dashboard. The goal is to show Codex using real data to help the user understand a recommendation and move directly into campaign creation.

Visual references:

- `docs/dashboard/products-dashboard-clean.png` for the simple dashboard body.
- `docs/dashboard/products-dashboard-codex-popup.png` for the promotion suggestions popup and highlighted-row idea.
- `docs/dashboard/product-detail-campaign-history.png` for product detail and campaign history.
- `docs/dashboard/campaign-create-scrollable.png` for the campaign create/detail page.

## Page 2: Product Detail And Campaign History

Clicking a product opens a product detail page.

Show:

- product name;
- SKU;
- category;
- price;
- available quantity;
- sold this month;
- existing campaigns for that product.

Clicking an existing campaign opens the campaign detail page.

This page is for viewing product context and past campaigns. Fresh campaign generation starts from the campaign create page.

## Page 3: Campaign Create And Detail

Selecting one product on the products page and clicking `Create campaign` opens the campaign create page. The user can also open the same campaign create page from a suggested product's AI recommendation popover.

Required campaign setup fields:

- discount percent slider from 1% to 100%;
- quantity limit;
- initial image variant count.

Optional field:

- campaign instructions.

Main action:

```text
Generate
```

When the user clicks `Generate`:

1. The backend validates the selected product, discount, quantity limit, image variant count, and optional instructions.
2. Codex receives product context, product sales signals, and the offer terms.
3. Codex generates campaign content and an image prompt.
4. The backend generates the requested initial image variants.
5. The backend saves the campaign and image rows.
6. The UI shows the generated campaign result.

The campaign detail state shows:

- selected product;
- AI recommendation;
- Instagram caption;
- image prompt;
- campaign instructions;
- generated image variants.

The campaign detail page can also offer a later action to generate another image variant from the saved image prompt and optional custom guidance.

## Workflow Story

```text
Product and sales data
  -> promo-campaign-mcp exposes safe read-only context
  -> Codex suggests products that need promotion attention
  -> user reviews an AI recommendation
  -> user sets discount, quantity limit, and initial image count
  -> Codex generates campaign content and image prompt
  -> backend generates initial image variants
  -> app saves and displays the campaign
  -> product detail shows campaign history
  -> campaign detail can generate additional image variants later
```
