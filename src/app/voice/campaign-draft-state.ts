import type { VoiceCampaignDraft } from "@/app/voice/voice-types";

export function applyCampaignDraftPatch(
  current: VoiceCampaignDraft,
  patch: Partial<VoiceCampaignDraft>
): VoiceCampaignDraft {
  return {
    ...current,
    ...patch,
    imageVariants: patch.imageVariants ?? current.imageVariants
  };
}
