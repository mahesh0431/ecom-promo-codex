# Retail Promo Agent

## Idea

Retail Promo Agent helps an eCommerce team find products that need campaign attention and create a simple promo campaign with Codex.

Many promotion workflows start from a blank brief or a rushed guess. Retail Promo Agent starts from product and sales data. Codex inspects that context through a small read-only MCP layer for the app, identifies products with signals such as high stock and low recent sales, explains why they need attention, and helps create a promo campaign for the selected product.

A promo campaign is more than a caption. It includes the offer terms the business needs to run: discount, quantity limit, campaign content, image prompt, and generated image variants.

The product should feel like a focused workflow, not a generic chatbot. The user should always know what Codex looked at, why a product was selected, and what campaign output was generated.

## Core Flow

1. The user starts the local demo app.
2. The user signs in with the seeded demo account.
3. The user sees product metrics and a product table.
4. The user clicks `Generate Promotion Suggestions`.
5. Codex uses read-only MCP tools to inspect product and sales context.
6. Codex highlights the products that need campaign attention.
7. The user can view an AI recommendation for each suggested product and start campaign creation from that recommendation.
8. The campaign create page asks for required offer and image setup: discount, quantity limit, initial image variant count, and aspect ratio.
9. The user can add an optional custom image prompt.
10. Codex generates campaign content and image prompts from the product context and offer terms.
11. The backend generates the initial image variants, then saves and displays the campaign.
12. The campaign detail page can generate additional image variants later.

## Campaign Output

A generated campaign can include:

- selected product;
- product and sales signal;
- discount;
- quantity limit;
- Instagram caption;
- image prompt;
- generated image variants.

## Product Evolution

**V0: Instagram Promo Demo**

A local demo app that proves auth, persistence, Codex SDK usage, a small read-only MCP layer, promo campaign creation, and OpenAI image generation.

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
