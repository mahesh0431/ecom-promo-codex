# Data Model

The data model should stay small and focused on the campaign workflow.

Auth/session tables can be owned by the auth layer. The app model only needs to associate saved campaigns with the current seeded user or demo session.

V0 does not include account creation. The seed process creates the demo user, and the UI only supports signing in with that seeded account.

## Demo Persistence Scope

V0 uses a local SQLite database seeded for the demo.

The seed process should create:

- one demo user matching the README credentials;
- a small product catalog;
- dated product sales records.

After the seed runs, the SQLite database belongs to the local app instance. Generated campaigns and generated images are saved into that local database.

This keeps the demo reproducible without requiring an external database or manual data entry.

## User Or Demo Session

Represents the seeded demo user/session that owns generated campaigns.

The local demo should seed one user so the README can provide shared demo credentials. New users are not created through the app in V0.

```text
User or Demo Session
- id
- email
- passwordHash
- createdAt
```

## Product

Represents the product catalog.

```text
Product
- id
- sku
- name
- category
- priceCents
- availableQuantity
- createdAt
- updatedAt
```

## ProductSale

Represents dated sales records for products.

Use a date instead of a month field so the app can compute monthly totals or other windows later.

```text
ProductSale
- id
- productId
- saleDate
- unitsSold
- createdAt
```

Relationship:

```text
Product 1 -> many ProductSale
```

## Campaign

Represents one generated Instagram campaign for one product.

```text
Campaign
- id
- userId or demoSessionId
- productId
- prompt
- optionalInstructions
- instagramCaption
- imagePrompt
- codexReasoning
- createdAt
```

Relationship:

```text
Product 1 -> many Campaign
```

```text
User or Demo Session 1 -> many Campaign
```

## CampaignImage

Represents generated image variants for a campaign.

```text
CampaignImage
- id
- campaignId
- prompt
- imageData
- mimeType
- variantIndex
- model
- size
- status
- errorMessage
- createdAt
```

Relationship:

```text
Campaign 1 -> many CampaignImage
```

For the current app, storing image data in the database is acceptable because it keeps the system self-contained. This can move to file or object storage later.

## Demo Queries

Useful query ideas:

- total product count;
- total available stock;
- units sold in the current month;
- products with high available quantity and low recent sales.

The read-only MCP server can expose these facts to Codex without giving Codex write access to the database.
