# Retail Promo Agent

## Idea

Retail Promo Agent helps an eCommerce team find products that need campaign attention and generate a simple Instagram promotion with Codex.

Many promotion workflows start from a blank brief or a rushed guess. Retail Promo Agent starts from product and sales data. Codex inspects that context through a small read-only MCP layer for the app, identifies products with signals such as high stock and low recent sales, explains why they need attention, and helps generate a campaign for the selected product.

The product should feel like a focused workflow, not a generic chatbot. The user should always know what Codex looked at, why a product was selected, and what campaign output was generated.

## Core Flow

1. The user starts the local demo app.
2. The user signs in with the seeded demo account.
3. The user sees product metrics and a product table.
4. The user clicks `Find Campaign Opportunities`.
5. Codex uses read-only MCP tools to inspect product and sales context.
6. Codex highlights the products that need campaign attention and explains why.
7. The user selects one product and adds optional campaign instructions.
8. Codex generates an Instagram caption and image prompt.
9. The app saves and displays the campaign.
10. On the campaign detail page, the user generates image variants from the saved image prompt.

## Campaign Output

A generated campaign can include:

- selected product;
- product and sales signal;
- Codex reasoning;
- optional user instructions;
- Instagram caption;
- image prompt;
- generated image variants.

## Product Evolution

**V0: Instagram Promo Demo**

A local demo app that proves auth, persistence, Codex SDK usage, a small read-only MCP layer, Instagram campaign generation, and OpenAI image generation.

**V1: Realtime Voice**

Let users talk through campaign refinement and variant generation.

**V2: Codex App Skill And MCP**

Make the workflow available inside Codex App through a skill and MCP tools, with the app API as the system of record.

## Boundaries

This product should avoid:

- becoming a generic chat assistant;
- pretending to replace the commerce platform;
- making image generation the whole product;
- adding unrelated features before the core demo works.
