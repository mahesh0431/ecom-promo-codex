# Image Generation

Image generation is part of campaign creation in V0. It stays backend-owned and separate from the Codex SDK proof, but the user should see initial image variants created with the campaign.

## Role Split

Codex SDK generates:

- Instagram caption;
- image prompt;
- campaign reasoning;
- campaign content that respects discount and quantity limit.

The backend generates images:

- uses the campaign image prompt returned by Codex during creation;
- reads the saved campaign image prompt for later additional variants;
- calls the OpenAI image generation API;
- stores decoded image bytes in `CampaignImage.imageData`;
- serves metadata through JSON routes and raw bytes through the image route.

## Flow

```text
Campaign create form
  -> user enters discount, quantity limit, and image variant count
  -> Codex generates campaign content and image prompt
  -> backend generates requested initial image variants
  -> backend saves campaign and CampaignImage rows together
  -> campaign detail shows saved content and images
```

Additional variants use the saved campaign:

```text
Saved campaign
  -> user clicks Generate Another Image Variant
  -> backend sends imagePrompt to OpenAI image generation
  -> backend stores CampaignImage rows
  -> future UI reads metadata and fetches raw image bytes
```

## Local and Failure Behavior

Image generation is mandatory for campaign creation in V0. Local development and tests can use deterministic fake image generation. The final demo path should use live OpenAI image generation.

If live image generation fails during campaign creation, the backend returns an image-generation error and does not save a partial campaign row.

## Runtime Auth

Image generation and Codex SDK runs both use the backend `OPENAI_API_KEY`. `IMAGE_GENERATION_MODE` switches between deterministic `fake` generation and live `openai` generation; it is not a credential.

The app should show image runtime readiness, but should not ask the user to enter an API key in the browser during the demo.
