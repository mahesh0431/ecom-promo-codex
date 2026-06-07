---
name: promo-campaign-studio
description: Use this in ecom-promo-codex to inspect products, recommend promo opportunities, create Codex App-authored campaigns, view campaigns, and generate campaign images through the local app HTTP APIs.
---

Use the running Promo Campaign Studio app API for product, campaign, and campaign-image work in this repo. Do not edit source files for app data tasks unless the user explicitly asks for code changes.

Before API work, read `setup.md` in this skill folder and follow its validation steps. The expected app URL is `http://localhost:3000`.

This is a demo skill for a local app. The app server is the contract, and this skill is only an API client. The user must follow the project README setup and keep the dev server running before this skill can work.

Be strict about setup. If `.env`, `OPENAI_API_KEY`, seeded data, login, or `http://localhost:3000` is missing, stop. Do not start the server, run setup commands, repair local data, or continue in fake mode.

When setup is incomplete, say plainly that this local demo skill needs the app running first, then ask the user to follow the README local setup, add `OPENAI_API_KEY` to `.env`, run `pnpm dev`, and retry.

Workflow:

1. Login with the seeded demo account and keep the returned cookie for subsequent API calls.
2. Start with `GET /api/products/overview` or `GET /api/products`.
3. For recommendations, inspect product data yourself from `GET /api/products`; use product stock, current-month sales, `recentSalesSummary`, and `signalFacts` to decide.
4. Never invent product IDs or campaign IDs. Use IDs returned by the app API.
5. Use `GET /api/products/{productId}/campaign-context` before creating a campaign for a specific product.
6. For campaign creation, write the recommendation, caption, and image prompt yourself, then call `POST /api/campaigns`.
7. Use `GET /api/campaigns` and `GET /api/campaigns/{campaignId}` to view saved campaigns.
8. Use `POST /api/campaigns/{campaignId}/images/generate` only when the user asks for additional saved campaign images.
9. Keep additional image `customInstructions` to 500 characters or fewer.
10. For any returned image metadata, fetch each returned `imageUrl` with the saved auth cookie, save it to the current thread outputs folder when available, and embed it with Markdown image syntax.

Boundaries:

- Do not require MCP setup for this skill workflow.
- Do not call `POST /api/campaign-opportunities` or `POST /api/campaigns/generate`. Those endpoints exist for the app's in-UI backend Codex SDK demo; this skill should let Codex App be the agent.
- Do not set `CODEX_GATEWAY=fake` or `IMAGE_GENERATION_MODE=fake`.
- Do not start, stop, or restart the app server. The user owns local setup and app startup.
- Do not call product/campaign APIs if health, login, or seeded-data validation fails.
- Do not use Codex's built-in image generation for saved campaign assets. Saved images must go through the app API so they persist in SQLite.
- Do not request raw SQL, secrets, auth/session data, or product mutations.
- Image URLs are relative app URLs for a logged-in browser session. Do not only return localhost image URLs to the user.

When an action succeeds, summarize the saved campaign ID, product, offer terms, and render generated images inline when images were created.
