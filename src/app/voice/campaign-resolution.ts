import { normalizeSearchValue } from "@/app/voice/product-resolution";
import type { VoiceCampaignSummary } from "@/app/voice/voice-types";

export type CampaignResolution =
  | { kind: "matched"; campaign: VoiceCampaignSummary }
  | { kind: "ambiguous"; matches: VoiceCampaignSummary[] }
  | { kind: "missing" };

const NUMBER_WORDS = new Map([
  ["zero", 0],
  ["one", 1],
  ["first", 1],
  ["two", 2],
  ["second", 2],
  ["three", 3],
  ["third", 3],
  ["four", 4],
  ["fourth", 4],
  ["five", 5],
  ["fifth", 5],
  ["six", 6],
  ["sixth", 6],
  ["seven", 7],
  ["seventh", 7],
  ["eight", 8],
  ["eighth", 8],
  ["nine", 9],
  ["ninth", 9],
  ["ten", 10],
  ["tenth", 10]
]);

export function resolveCampaignReference(
  campaigns: VoiceCampaignSummary[],
  reference?: string
): CampaignResolution {
  const sortedCampaigns = [...campaigns].sort(compareNewestFirst);

  if (!sortedCampaigns.length) {
    return { kind: "missing" };
  }

  const normalizedReference = normalizeSearchValue(reference ?? "");

  if (!normalizedReference) {
    return singleOrAmbiguous(sortedCampaigns);
  }

  const exact = sortedCampaigns.find(
    (campaign) =>
      campaign.campaignId === reference ||
      normalizeSearchValue(campaign.campaignId) === normalizedReference
  );

  if (exact) {
    return { kind: "matched", campaign: exact };
  }

  if (isLatestReference(normalizedReference)) {
    return { kind: "matched", campaign: sortedCampaigns[0] };
  }

  if (isOldestReference(normalizedReference)) {
    return {
      kind: "matched",
      campaign: [...sortedCampaigns].sort(compareOldestFirst)[0]
    };
  }

  const ordinal = extractOrdinal(normalizedReference);
  if (ordinal && sortedCampaigns[ordinal - 1]) {
    return { kind: "matched", campaign: sortedCampaigns[ordinal - 1] };
  }

  const numbers = extractNumbers(normalizedReference);
  if (!numbers.length) {
    return { kind: "missing" };
  }

  if (hasDiscountCue(normalizedReference)) {
    return singleOrAmbiguous(
      sortedCampaigns.filter((campaign) =>
        numbers.includes(campaign.discountPercent)
      )
    );
  }

  if (hasQuantityCue(normalizedReference)) {
    return singleOrAmbiguous(
      sortedCampaigns.filter((campaign) =>
        numbers.includes(campaign.quantityLimit)
      )
    );
  }

  if (hasImageCue(normalizedReference)) {
    return singleOrAmbiguous(
      sortedCampaigns.filter((campaign) => numbers.includes(campaign.imageCount))
    );
  }

  return singleOrAmbiguous(
    sortedCampaigns.filter(
      (campaign) =>
        numbers.includes(campaign.discountPercent) ||
        numbers.includes(campaign.quantityLimit) ||
        numbers.includes(campaign.imageCount)
    )
  );
}

export function formatCampaignResolutionFailure(
  reference: string | undefined,
  campaigns: VoiceCampaignSummary[]
) {
  const result = resolveCampaignReference(campaigns, reference);

  if (result.kind === "ambiguous") {
    return `I found multiple campaigns: ${result.matches
      .map(formatCampaignSummaryForVoice)
      .join("; ")}. Please say latest, oldest, discount percent, quantity, or image count.`;
  }

  if (!campaigns.length) {
    return "This product does not have any saved campaigns yet.";
  }

  return reference
    ? `I could not find a campaign matching "${reference}".`
    : "Please say which campaign to open, such as latest campaign or the discount percent.";
}

function singleOrAmbiguous(
  campaigns: VoiceCampaignSummary[]
): CampaignResolution {
  if (!campaigns.length) {
    return { kind: "missing" };
  }

  if (campaigns.length === 1) {
    return { kind: "matched", campaign: campaigns[0] };
  }

  return { kind: "ambiguous", matches: campaigns };
}

function compareNewestFirst(
  firstCampaign: VoiceCampaignSummary,
  secondCampaign: VoiceCampaignSummary
) {
  return (
    new Date(secondCampaign.createdAt).getTime() -
    new Date(firstCampaign.createdAt).getTime()
  );
}

function compareOldestFirst(
  firstCampaign: VoiceCampaignSummary,
  secondCampaign: VoiceCampaignSummary
) {
  return (
    new Date(firstCampaign.createdAt).getTime() -
    new Date(secondCampaign.createdAt).getTime()
  );
}

function isLatestReference(reference: string) {
  return (
    reference.includes("latest") ||
    reference.includes("newest") ||
    reference.includes("most recent") ||
    reference.includes("recent campaign")
  );
}

function isOldestReference(reference: string) {
  return reference.includes("oldest") || reference.includes("earliest");
}

function extractOrdinal(reference: string) {
  if (!reference.includes("campaign")) {
    return null;
  }

  for (const token of reference.split(" ")) {
    const number = NUMBER_WORDS.get(token);
    if (number && number > 0) {
      return number;
    }
  }

  const match = /\b(\d+)(st|nd|rd|th)?\b/.exec(reference);
  return match ? Number(match[1]) : null;
}

function extractNumbers(reference: string) {
  const numericValues = new Set<number>();
  for (const match of reference.matchAll(/\b\d+\b/g)) {
    numericValues.add(Number(match[0]));
  }

  for (const token of reference.split(" ")) {
    const value = NUMBER_WORDS.get(token);
    if (value !== undefined) {
      numericValues.add(value);
    }
  }

  return [...numericValues];
}

function hasDiscountCue(reference: string) {
  return (
    reference.includes("discount") ||
    reference.includes("percent") ||
    reference.includes("off")
  );
}

function hasQuantityCue(reference: string) {
  return (
    reference.includes("quantity") ||
    reference.includes("unit") ||
    reference.includes("limit")
  );
}

function hasImageCue(reference: string) {
  return reference.includes("image") || reference.includes("creative");
}

function formatCampaignSummaryForVoice(campaign: VoiceCampaignSummary) {
  return `${campaign.discountPercent}% off, ${campaign.quantityLimit} units, ${campaign.imageCount} images`;
}
