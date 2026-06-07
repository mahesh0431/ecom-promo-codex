# Realtime Voice Control

Realtime voice is a V1 layer over the existing promo workflow.

The voice agent controls the browser UI through a small set of typed app actions. It does not scrape the DOM, use computer control, or call backend business APIs directly. The same React workflow handlers used by buttons also power voice actions, so mouse and voice behavior stay aligned.

## How It Works

1. A signed-in user starts voice control from the app.
2. The browser asks `POST /api/realtime/session` for a short-lived realtime client secret.
3. The backend creates that secret with the server-side `OPENAI_API_KEY`.
4. The browser opens a WebRTC realtime session with `gpt-realtime-2`.
5. The assistant gives a short neutral greeting.
6. The voice agent reads compact screen context and calls typed UI tools.

The browser never receives the normal OpenAI API key.

## Voice UI

Voice starts from a compact mic button in the bottom-right corner. The control expands only while voice is active or in an error state.

Active voice mode shows:

- a small listening/running/speaking status;
- a stop control;
- a subtle mic animation while audio is active.

The voice UI should stay out of the main workflow. It is a control surface, not a chat panel.

## Voice Tools

The voice layer can:

- read the current page context;
- open a product by name, SKU, or ID;
- go back or close a safe dialog;
- generate promotion suggestions;
- open a product recommendation;
- open campaign creation for a product;
- set discount, quantity, image variants, aspect ratio, and custom image prompt;
- generate a campaign;
- open the additional image dialog;
- generate one more campaign image.

Actions that trigger Codex or image generation run through the same UI handlers as button clicks, so the normal loading and error dialogs still appear.

Campaign draft changes made by voice update the same draft state as the visible form. The draft is also kept in a synchronous local snapshot so a fast voice sequence such as "set discount to 20 percent, one image, quantity 45, then generate" uses the latest values instead of stale React state.

## Boundaries

Voice control is optional. The app still works fully with normal clicks.

Voice needs microphone permission in the browser and a configured `OPENAI_API_KEY`. Deterministic fake Codex/image modes are still useful for non-voice UI checks, but realtime voice itself is a live OpenAI feature.
