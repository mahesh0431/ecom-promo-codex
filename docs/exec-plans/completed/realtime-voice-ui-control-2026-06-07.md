# Add realtime voice control for the promo workflow

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `docs/PLAN.md`.

## Purpose / Big Picture

Add a browser-based realtime voice layer that lets a signed-in demo user talk through the existing promotion workflow. The user should be able to ask for promotion suggestions, open the right product by name, review recommendations, create a campaign, set offer terms, generate the campaign, and generate another image without manually clicking through every step.

The voice layer must understand the current page and visible app data. It should not guess from pixels or scrape the DOM. It should receive a compact structured screen context from the React app and call a small set of typed UI tools that execute the same handlers the buttons already use.

The user-visible proof is simple: after enabling voice mode, the user can say commands like "open Amber Soy Candle", "show its recommendation", "create a campaign for this product", "set discount to 15 percent and quantity to 50", and "generate the campaign". The UI should navigate, select, open dialogs, and run existing backend flows correctly.

## Progress

- [x] (2026-06-07 07:35Z) [M1] Initial ExecPlan drafted from current docs, current UI code, and current OpenAI Realtime guidance.
- [x] (2026-06-07 07:42Z) [M1] Validated this exact plan with a fresh sub-agent and folded in feedback about nested React state, realtime route contract, and testability.
- [x] (2026-06-07 12:47Z) [M2] Added `@openai/agents`, authenticated `POST /api/realtime/session`, and server-side realtime client-secret creation through `OPENAI_API_KEY`.
- [x] (2026-06-07 12:47Z) [M3] Lifted recommendation, campaign draft, campaign generation, and additional-image dialog state into the main workflow so voice and mouse actions share one path.
- [x] (2026-06-07 12:47Z) [M4] Added compact screen context, natural product resolution, voice result helpers, and typed workflow command contracts under `src/app/voice/`.
- [x] (2026-06-07 12:47Z) [M5] Added `useRealtimeVoiceSession` with `gpt-realtime-2`, low reasoning, and typed tools.
- [x] (2026-06-07 12:47Z) [M6] Added a small voice control panel without changing the core dashboard layout.
- [x] (2026-06-07 13:05Z) Simplified voice actions to run directly through the existing UI flow, removing the extra approval dialog.
- [x] (2026-06-07 12:47Z) [M7] Added unit tests and validated the app through the in-app Browser without triggering microphone permission or paid AI actions.

## Surprises & Discoveries

- Observation: The current UI already centralizes the key actions in `src/app/promo-workflow.tsx`: `handleAskCodex`, `openProduct`, `openCampaignCreate`, `openExistingCampaign`, `generateCampaign`, and `generateAdditionalImage`.
  Evidence: Reading `src/app/promo-workflow.tsx` shows the dashboard, product detail, campaign create/detail, recommendation dialog, and generation actions are already driven by React state and callback props.

- Observation: The current repo does not yet depend on `@openai/agents`, which is needed for the Agents SDK realtime browser layer.
  Evidence: `package.json` has `openai` and `@openai/codex-sdk`, but no `@openai/agents`.

- Observation: Some voice-controllable state is currently nested inside child components. `DashboardView` owns the open recommendation dialog state, and `CampaignWorkspace` owns campaign draft fields, additional image dialog state, and generation modal/error state.
  Evidence: `src/app/promo-workflow.tsx` keeps `openRecommendationProductId` inside `DashboardView`, while `CampaignWorkspace` owns `discountPercent`, `quantityLimit`, `imageVariants`, `aspectRatio`, and `customImagePrompt`.

- Observation: The existing campaign and image flows already show blocking loading/error dialogs.
  Evidence: `CampaignWorkspace` uses the same generation state for click and voice-triggered generation, so an extra voice approval dialog adds ceremony without adding demo clarity.

## Decision Log

- Decision: Use browser WebRTC through the OpenAI Agents SDK realtime APIs, not WebSocket audio from the server.
  Rationale: The app captures and plays audio in the browser. OpenAI's realtime docs recommend WebRTC for browser/mobile clients and the Agents SDK for browser voice agents.
  Date/Author: 2026-06-07 / Codex

- Decision: Add a minimal server endpoint that mints a short-lived realtime client secret. Do not expose `OPENAI_API_KEY` in browser code.
  Rationale: Browser voice needs a client-side credential, but the normal API key must stay on the backend.
  Date/Author: 2026-06-07 / Codex

- Decision: Give the voice agent a `get_screen_context` tool and a compact app-state snapshot instead of full DOM access, computer use, or server-side business tools.
  Rationale: The user wants voice to control the UI. The backend already performs business actions after the UI invokes normal API calls. A typed UI action layer is safer and easier for the model to use than raw page inspection.
  Date/Author: 2026-06-07 / Codex

- Decision: Keep voice actions direct and simple.
  Rationale: This is a demo workflow. The user asked to keep it KISS, and the app's existing loading/error dialogs already make long-running generation visible.
  Date/Author: 2026-06-07 / User and Codex

- Decision: Build a small workflow command surface before wiring Realtime.
  Rationale: Voice needs to set campaign fields and open recommendation/image dialogs without DOM automation. The campaign form and mouse UI should call the same command functions so behavior stays consistent.
  Date/Author: 2026-06-07 / Codex

- Decision: The realtime credential route returns a narrow app response, not the whole upstream OpenAI payload.
  Rationale: Browser code only needs the generated client secret value and expiration time. Keeping the response narrow avoids leaking unnecessary upstream session details.
  Date/Author: 2026-06-07 / Codex

## Outcomes & Retrospective

Completed. V1 now has a browser voice control layer over the existing promo workflow. The backend mints short-lived realtime client secrets, the browser uses the Agents SDK realtime session, and voice tools operate through typed React workflow commands instead of DOM automation or direct backend business calls.

Validation completed:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- in-app Browser reload of `http://127.0.0.1:3000/`
- in-app Browser product navigation to Cold Brew Concentrate
- in-app Browser campaign-create navigation with default `0%` discount and `0` quantity
- in-app Browser console error check

Manual microphone/realtime testing is still expected when the user is ready, because starting voice mode may require browser microphone permission and a live OpenAI realtime session.

## Context and Orientation

The active app is `/Users/mahesh/Projects/ecom-promo-codex`.

The current user-facing workflow is documented in `docs/product/campaign-workflow.md`:

- dashboard shows product metrics and a product table;
- `Generate Promotion Suggestions` calls Codex-backed opportunity selection;
- recommended rows show `View recommendation`;
- `Create campaign` opens campaign creation for one product;
- campaign creation captures discount, quantity limit, image variant count, aspect ratio, and optional custom image prompt;
- `Generate` creates campaign copy and campaign creative;
- campaign detail can generate another image variant.

The technical direction is in `ARCHITECTURE.md`: V1 adds realtime voice, while Codex remains the workflow core and the backend remains the system of record.

Important current files:

- `src/app/promo-workflow.tsx` is the main client UI and state owner.
- `src/app/api/campaign-opportunities/route.ts` runs promotion suggestion generation.
- `src/app/api/campaigns/generate/route.ts` creates campaigns.
- `src/app/api/campaigns/[campaignId]/images/route.ts` generates additional campaign images.
- `src/server/env.ts` owns environment validation.
- `src/components/ui/` contains shadcn-style UI primitives already used by the app.

Definitions:

- "Realtime session" means one live browser voice connection to OpenAI while voice mode is enabled.
- "Screen context" means a small JSON snapshot of the current app page, visible products, selected product, visible campaigns, active dialogs, loading states, and recommendation data.
- "Voice action" means a typed browser-side function that changes app UI state or invokes an existing UI handler. It is not a backend business API and it is not DOM automation.

## Milestones

Milestone 1: Finalize the V1 contract.

At the end of this milestone, this plan has been reviewed and updated. The voice scope is locked to browser UI control over the existing promo workflow. The work touches only this ExecPlan and possibly durable docs if the review finds a product-level decision that belongs outside the plan. Validate by reading the plan against `docs/product/campaign-workflow.md`, `ARCHITECTURE.md`, and current OpenAI realtime docs. The expected result is a plan that can be implemented without relying on chat history.

Milestone 2: Add the realtime session foundation.

At the end of this milestone, the app has a server route such as `src/app/api/realtime/session/route.ts` that requires the seeded app session, uses server-side `OPENAI_API_KEY`, and returns a short-lived realtime client secret for `gpt-realtime-2`. The route accepts only `POST`, disables caching, maps upstream failures to a local realtime error, and does not return upstream errors verbatim.

The route response shape is:

    {
      "clientSecret": "short-lived client secret value",
      "expiresAt": 1234567890
    }

The route should set `OpenAI-Safety-Identifier` on the server-side OpenAI request using a stable, privacy-preserving value derived from the signed-in demo user ID. The work also adds `@openai/agents` to `package.json` and updates the lockfile. Run `pnpm install`, `pnpm typecheck`, and a focused route test. The expected result is that browser code can request a realtime credential without seeing the normal API key.

Milestone 3: Create the workflow command surface.

At the end of this milestone, the existing UI and future voice tools can call the same browser-side workflow commands. The work should avoid DOM automation and avoid duplicating backend logic.

The command surface should cover:

- selecting and opening a product;
- opening and closing the promotion suggestions dialog;
- opening a row-level recommendation dialog by product ID after suggestions exist;
- opening campaign create for a product, optionally with suggested offer terms;
- reading and setting the current campaign draft fields;
- submitting the current campaign draft through the same blocking modal/error path as the form button;
- opening the additional-image dialog;
- setting additional image custom direction;
- submitting additional image generation through the same blocking modal/error path as the button;
- closing the active dialog when the active dialog is safe to close.

Implementation can either lift the relevant state into `PromoWorkflow` or create a small controlled hook used by `DashboardView` and `CampaignWorkspace`. Prefer the smallest change that gives voice and mouse UI one shared command path. Run focused unit tests for command preconditions and invalid-state failures. The expected result is that voice does not need to reach into child component internals or query the DOM.

Milestone 4: Build the screen-context and action registry.

At the end of this milestone, `src/app/voice/` contains pure TypeScript helpers that create a compact screen context and resolve natural product or campaign references to known IDs. The context must include:

- current view: `dashboard`, `product`, or `campaign`;
- selected product ID and selected product label;
- visible product summaries: product ID, name, SKU, category, price, available stock, sold this month, and recommendation state;
- visible opportunity summaries after suggestions are generated: product ID, rank, reason, confidence, recommended discount, and recommended quantity;
- current product details and campaign history when on product detail;
- current campaign ID, generated caption/image prompt availability, and image count when on campaign detail;
- active dialogs: suggestions dialog, recommendation dialog, image direction dialog, generation modal, or none;
- loading states that should block new actions.

The same milestone adds browser-side voice action functions that call the workflow command surface from Milestone 3. Run unit tests for exact and fuzzy product matching, campaign matching, command preconditions, and context snapshot size. The expected result is that all 10 seeded products can be resolved by name, SKU, or a clear partial phrase like "soy candle" or "cold brew". If multiple matches remain possible, the action should return an ambiguity result that the voice agent can turn into a clarifying question.

Milestone 5: Connect the Realtime Agent SDK.

At the end of this milestone, a hook such as `useRealtimeVoiceSession` creates a `RealtimeAgent` and `RealtimeSession` in the browser. It uses `model: "gpt-realtime-2"`, `reasoning.effort: "low"`, browser audio output, and a tiny tool set. The tools should be limited to actions the app supports:

- `get_screen_context`
- `open_product`
- `generate_promotion_suggestions`
- `open_recommendation`
- `create_campaign_for_product`
- `set_campaign_offer`
- `generate_campaign`
- `open_additional_image_dialog`
- `generate_another_image`
- `close_dialog`

Tool semantics must be exact:

- `open_product` accepts a product name, SKU, or product ID and opens product detail only after resolving a single product.
- `generate_promotion_suggestions` opens the normal blocking suggestions dialog and runs the existing UI handler.
- `open_recommendation` accepts a product reference and works only after suggestions exist.
- `create_campaign_for_product` accepts a product reference and optionally uses suggested offer terms when the product has an opportunity.
- `set_campaign_offer` accepts `discountPercent`, `quantityLimit`, `imageVariants`, and `aspectRatio`; `imageVariants` is restricted to `1` or `2`.
- `generate_campaign` submits the current campaign draft and uses the existing campaign generation modal.
- `open_additional_image_dialog` works only when a generated campaign is open.
- `generate_another_image` accepts optional custom direction and works only when a generated campaign is open.
- `close_dialog` closes only safe active dialogs and must not interrupt an in-flight generation modal.

The agent instructions should tell the model to inspect screen context before choosing products or campaigns, prefer exact product names, and ask a clarifying question if multiple products match. Run `pnpm typecheck` and unit tests for the tool schemas. The expected result is that typed tools call browser functions and return short, structured success/error messages to the model.

Milestone 6: Add the voice-mode UI layer.

At the end of this milestone, the app has a simple visible voice UI built with existing shadcn-style components. It should be easy to notice without making the dashboard feel like a voice demo page.

Recommended UI:

- small `Voice mode` button in the header or bottom-right;
- expanded floating panel or dialog while active;
- status text for listening, thinking, speaking, executing, and error;
- short transcript/current intent display;
- stop/close control that disconnects the realtime session and releases the microphone.

The UI should not add a fake agent activity console. The visible value is "talk to the workflow", not "watch an agent log".

Run `pnpm typecheck`, `pnpm lint`, and a browser manual check. The expected result is that starting and stopping voice mode works cleanly, microphone errors are visible, and the rest of the app still works by mouse.

Milestone 7: Validate with live workflow scenarios.

At the end of this milestone, automated tests pass and at least one live in-app Browser scenario has been executed. Run:

    cd /Users/mahesh/Projects/ecom-promo-codex
    pnpm typecheck
    pnpm lint
    pnpm test

Expected: all commands pass.

Manual browser scenarios:

1. Sign in with the seeded demo user.
2. Start voice mode.
3. Say "open Amber Soy Candle".
4. Expected: product detail opens for Amber Soy Candle.
5. Say "go back" and then "generate promotion suggestions".
6. Expected: the blocking suggestions dialog opens and suggested products appear at the top of the table.
7. Say "show recommendation for Cold Brew Concentrate" or another suggested product.
8. Expected: the row-level recommendation dialog opens.
9. Say "create a campaign for this product".
10. Expected: campaign create page opens with suggested offer terms when available.
11. Say "set discount to 15 percent and quantity to 50".
12. Expected: form fields update.
13. Say "generate the campaign".
14. Expected: the existing blocking generation modal appears; on success, campaign details and campaign creative are visible.

## Plan of Work

First, add the server-side realtime credential route and the Agents SDK dependency. Keep it behind app auth and `OPENAI_API_KEY`. Do not put the normal API key in any client component or public environment variable.

Next, create the browser workflow command surface. This is the critical implementation step: voice should call the same commands as the UI, and campaign generation must reuse the existing blocking modal and error handling path. Do not call the backend directly from voice tools in ways that bypass current UI behavior.

Then extract enough current `PromoWorkflow` state into a small serializable `VoiceScreenContext`. The context must be intentionally compact so the realtime model is not overloaded. It should list the 10 seeded products and currently relevant campaigns or recommendations, but not full image blobs, full Codex logs, full database rows, or hidden server state.

Then add a voice action registry around the existing handlers. The action registry should know current preconditions: for example, `open_recommendation` only works after suggestions exist, `generate_campaign` only works on a campaign create/detail page with valid offer terms, and `generate_another_image` only works after a campaign exists.

Then wire `RealtimeAgent` and `RealtimeSession`. The model should be told it is controlling Promo Campaign Studio, not chatting generally. It should use tools for UI actions, speak briefly, and ask clarifying questions when a product reference is ambiguous.

Finally, add the UI. Use existing components and keep it restrained. The voice UI should make the active state obvious without taking over the product dashboard.

## Concrete Steps

1. Work from the standalone repo:

    cd /Users/mahesh/Projects/ecom-promo-codex

2. Install the Agents SDK dependency:

    pnpm add @openai/agents

3. Add `src/app/api/realtime/session/route.ts`.

   The route must:

   - use `runtime = "nodejs"`;
   - export only `POST`;
   - call `requireSession(request)`;
   - reject when `OPENAI_API_KEY` is missing;
   - call the OpenAI realtime client-secret endpoint using the server key;
   - request `gpt-realtime-2`;
   - set `reasoning.effort` to `low`;
   - set `OpenAI-Safety-Identifier` from a hashed user ID;
   - set no-store headers;
   - return `{ clientSecret, expiresAt }`;
   - avoid returning upstream error bodies verbatim.

4. Create a browser workflow command surface.

   Suggested files:

   - `src/app/workflow/workflow-command-types.ts`
   - `src/app/workflow/use-promo-workflow-controller.ts`

   A smaller file shape is acceptable if the implementation is clearer, but the command surface must be testable and must keep mouse and voice behavior aligned.

5. Add voice state modules under `src/app/voice/`.

   Suggested files:

   - `screen-context.ts`
   - `product-resolution.ts`
   - `voice-actions.ts`
   - `use-realtime-voice-session.ts`
   - `voice-types.ts`

6. Modify `src/app/promo-workflow.tsx` carefully.

   Keep existing behavior intact. Add:

   - a `VoiceController` or `VoiceMode` component;
   - context creation from current state;
   - action callbacks that call the shared workflow command surface;
   - controlled access for campaign fields inside `CampaignWorkspace` so voice and form interactions share discount, quantity, image variant, aspect ratio, custom prompt, and generation state.

7. Add tests.

   Suggested files:

   - `tests/voice/product-resolution.test.ts`
   - `tests/voice/screen-context.test.ts`
   - `tests/voice/voice-actions.test.ts`
   - `tests/voice/workflow-command-surface.test.ts`
   - a route test for `/api/realtime/session` if current test utilities make it straightforward.

   Tests should invoke the command surface directly. Live microphone testing is manual; automated tests should not depend on browser microphone permission.

8. Validate:

    pnpm typecheck
    pnpm lint
    pnpm test

9. Use the in-app Browser for manual testing at `http://127.0.0.1:3000/`.

## Validation and Acceptance

Automated acceptance:

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm test` passes.
- Tests prove product resolution works for all seeded product names and common partial references.
- Tests prove voice actions reject invalid page states with clear messages instead of silently doing nothing.

Security acceptance:

- No normal OpenAI API key reaches browser JavaScript.
- The realtime session route requires the seeded app session.
- Voice tools cannot read secrets, write directly to the database, or call arbitrary URLs.
- Realtime client secret creation is `POST` only, no-store, authenticated, and returns only `{ clientSecret, expiresAt }`.

UX acceptance:

- Voice mode visibly shows listening/thinking/speaking/executing states.
- Outside voice mode, the app remains usable with mouse and keyboard exactly as before.
- Voice can choose the right product from the 10 seeded products using compact app data, not DOM scraping.
- If a spoken reference is ambiguous, the assistant asks a clarifying question instead of opening a random product.

Live acceptance:

- From the dashboard, voice can open a named product.
- From the dashboard, voice can generate promotion suggestions.
- From suggested rows, voice can open a recommendation and create a campaign.
- From campaign create, voice can set discount and quantity, then generate a campaign.
- From campaign detail, voice can request another image after optional custom direction.

## Idempotence and Recovery

The realtime session route is additive and can be retried safely. If token creation fails, the UI should show a voice-mode error and leave the rest of the app untouched.

Voice mode start/stop should be safe to repeat. Stopping voice mode should disconnect the session, stop microphone tracks, and leave current app navigation unchanged.

If a voice action fails because the current page is wrong, return a clear tool result such as "Open a product first" or "Generate suggestions before opening a recommendation." Do not mutate state on failed preconditions.

If campaign generation or image generation fails, reuse the existing blocking modal error behavior where possible and keep the voice UI in an error state that the user can close.

Generated data remains local and app-owned. Do not commit `.env`, local SQLite files, generated runtime files, or generated images unless they are intentional docs assets.

## Artifacts and Notes

Official docs checked for this plan:

- OpenAI Realtime overview: `https://developers.openai.com/api/docs/guides/realtime`
- OpenAI Realtime WebRTC: `https://developers.openai.com/api/docs/guides/realtime-webrtc`
- OpenAI Agents JS voice agents: `https://openai.github.io/openai-agents-js/guides/voice-agents/`
- OpenAI Agents JS building voice agents and tools: `https://openai.github.io/openai-agents-js/guides/voice-agents/build/`

Current project docs referenced:

- `ARCHITECTURE.md`
- `docs/product/campaign-workflow.md`
- `docs/PLAN.md`

## Interfaces and Dependencies

New external dependency:

- `@openai/agents` for browser `RealtimeAgent`, `RealtimeSession`, and realtime tools.

OpenAI runtime:

- model: `gpt-realtime-2`;
- reasoning effort: `low`;
- transport: browser WebRTC through Agents SDK;
- browser credential: short-lived client secret minted by the backend;
- backend credential: existing server-side `OPENAI_API_KEY`.

Internal UI interfaces:

- `VoiceScreenContext` provides compact page/data awareness.
- `VoiceActionRegistry` exposes safe UI commands.
- `VoiceMode` or `VoiceController` renders the voice UI and owns session lifecycle.

The implementation must keep Codex SDK campaign generation unchanged. Realtime voice controls the UI; Codex remains the backend agentic layer for promotion recommendations and campaign content.
