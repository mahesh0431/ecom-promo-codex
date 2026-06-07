import { describe, expect, test } from "vitest";

import { resolveCampaignReference } from "@/app/voice/campaign-resolution";
import type { VoiceCampaignSummary } from "@/app/voice/voice-types";

const campaigns: VoiceCampaignSummary[] = [
  {
    campaignId: "campaign-old",
    productId: "prod-cold-brew",
    createdAt: "2026-06-06T10:00:00.000Z",
    discountPercent: 10,
    quantityLimit: 40,
    imageCount: 1
  },
  {
    campaignId: "campaign-new",
    productId: "prod-cold-brew",
    createdAt: "2026-06-07T10:00:00.000Z",
    discountPercent: 20,
    quantityLimit: 50,
    imageCount: 2
  },
  {
    campaignId: "campaign-same-discount",
    productId: "prod-cold-brew",
    createdAt: "2026-06-07T11:00:00.000Z",
    discountPercent: 20,
    quantityLimit: 60,
    imageCount: 1
  }
];

describe("voice campaign resolution", () => {
  test("matches latest, oldest, and spoken row ordinals", () => {
    expect(resolveCampaignReference(campaigns, "latest campaign")).toMatchObject({
      kind: "matched",
      campaign: { campaignId: "campaign-same-discount" }
    });
    expect(resolveCampaignReference(campaigns, "oldest campaign")).toMatchObject({
      kind: "matched",
      campaign: { campaignId: "campaign-old" }
    });
    expect(resolveCampaignReference(campaigns, "second campaign")).toMatchObject({
      kind: "matched",
      campaign: { campaignId: "campaign-new" }
    });
  });

  test("matches natural campaign facts", () => {
    expect(resolveCampaignReference(campaigns, "50 units")).toMatchObject({
      kind: "matched",
      campaign: { campaignId: "campaign-new" }
    });
    expect(resolveCampaignReference(campaigns, "two images")).toMatchObject({
      kind: "matched",
      campaign: { campaignId: "campaign-new" }
    });
    expect(resolveCampaignReference(campaigns, "campaign-old")).toMatchObject({
      kind: "matched",
      campaign: { campaignId: "campaign-old" }
    });
  });

  test("returns ambiguity instead of guessing duplicate campaign facts", () => {
    const result = resolveCampaignReference(campaigns, "20 percent");

    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.matches.map((campaign) => campaign.campaignId)).toEqual([
        "campaign-same-discount",
        "campaign-new"
      ]);
    }
  });
});
