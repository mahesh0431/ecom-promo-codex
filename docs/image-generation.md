# Image Generation

Image generation is a second-step workflow. It is part of the V0 demo, but it stays separate from the Codex SDK proof.

## Role Split

Codex SDK generates:

- Instagram caption;
- image prompt;
- campaign reasoning.

The backend generates images:

- reads the saved campaign image prompt;
- calls the OpenAI image generation API;
- stores decoded image bytes in `CampaignImage.imageData`;
- serves metadata through JSON routes and raw bytes through the image route.

## Flow

```text
Saved campaign
  -> user clicks Generate Image Variants
  -> backend sends imagePrompt to OpenAI image generation
  -> backend stores CampaignImage rows
  -> future UI reads metadata and fetches raw image bytes
```

## Fallback

If image generation is unavailable during local development, the app should still show the saved caption and image prompt. The final demo path should include generated image variants.

## Runtime Auth

Image generation should use the common backend `OPENAI_API_KEY`. `IMAGE_GENERATION_MODE` switches between deterministic `fake` generation and live `openai` generation; it is not a credential.

The app should show image runtime readiness, but should not ask the user to enter an API key in the browser during the demo.
