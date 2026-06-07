import { describe, expect, test } from "vitest";

import { applyCampaignDraftPatch } from "@/app/voice/campaign-draft-state";
import type { VoiceCampaignDraft } from "@/app/voice/voice-types";

const startingDraft: VoiceCampaignDraft = {
  discountPercent: 0,
  quantityLimit: 0,
  imageVariants: 2,
  aspectRatio: "Square",
  customImagePrompt: ""
};

describe("campaign draft state", () => {
  test("returns the next draft immediately for follow-up voice actions", () => {
    const nextDraft = applyCampaignDraftPatch(startingDraft, {
      discountPercent: 20,
      quantityLimit: 45,
      imageVariants: 1
    });

    expect(nextDraft).toMatchObject({
      discountPercent: 20,
      quantityLimit: 45,
      imageVariants: 1
    });
    expect(startingDraft).toMatchObject({
      discountPercent: 0,
      quantityLimit: 0,
      imageVariants: 2
    });
  });

  test("keeps the current image variant count when the voice patch omits it", () => {
    const nextDraft = applyCampaignDraftPatch(
      {
        ...startingDraft,
        imageVariants: 1
      },
      {
        discountPercent: 15,
        quantityLimit: 30
      }
    );

    expect(nextDraft.imageVariants).toBe(1);
  });
});
