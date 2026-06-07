# Codex App Skill

The repo skill lets Codex App work with the promo campaign workflow through the local app HTTP APIs.

The skill lives at:

```text
.agents/skills/promo-campaign-studio/SKILL.md
```

Codex App should use this skill when the user asks to inspect products, recommend promo opportunities, create saved campaigns, view saved campaigns, or generate more campaign images for this repo.

## How It Works

The skill uses the running app at `http://localhost:3000`, logs in with the seeded demo account, reads app data APIs, and saves Codex App-authored campaign output through the app API.

The important boundary: Codex App is the agent in this workflow. The skill should not call the app endpoints that start the backend Codex SDK agent.

The skill should be strict about setup. It should stop if `.env`, `OPENAI_API_KEY`, seeded data, or the app server is missing. It should ask the user to follow the README setup and make sure the dev server is running. It should not start the server, run setup commands, or switch to fake Codex or fake image generation for this workflow.

The flow is:

1. Read `.agents/skills/promo-campaign-studio/setup.md`.
2. Check `.env` and `OPENAI_API_KEY`.
3. Check that the app is running.
4. Login with `demo@promo.test / demo-password`.
5. Validate seeded product data through the app API.
6. Inspect overview, products, product context, and saved campaigns through app APIs.
7. Decide promotion recommendations inside Codex App from product stock, sales, summaries, and signal facts.
8. Call `POST /api/campaigns` with Codex App-authored caption, image prompt, reasoning, offer terms, and image count to create a saved campaign and initial images.
9. Call `POST /api/campaigns/{campaignId}/images/generate` when the user wants more saved image variants.
10. Fetch returned `imageUrl` values with the login cookie and render generated images inline in the Codex App response.

## API Boundary

The app API remains the contract:

- app auth stays on `/api/auth/login`;
- product context comes from `/api/products...`;
- Codex App recommendations come from Codex App reasoning over product API data;
- Codex App-authored campaign creation goes through `POST /api/campaigns`;
- image variants come from `/api/campaigns/{campaignId}/images/generate`.

The skill can use curl or any available HTTP mechanism. It should keep the login cookie for the session.

The skill must not call `POST /api/campaign-opportunities` or `POST /api/campaigns/generate`. Those routes are for the in-app UI flow where the backend Codex SDK agent does the recommendation or campaign generation.

## Data Rules

Codex App should never invent IDs. Product IDs and campaign IDs must come from API responses.

The skill should not request raw SQL, secrets, auth/session tables, or product mutations.

Campaign image URLs returned by the app are relative app URLs. They are only viewable through a logged-in app session.

When the skill creates or regenerates images, it should download the saved image through the app API and embed the local output file in the final response. Returning only a localhost image URL is not enough for this workflow.
