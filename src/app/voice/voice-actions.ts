import { resolveProductReference } from "@/app/voice/product-resolution";
import type {
  PromoWorkflowCommands
} from "@/app/voice/workflow-command-types";
import type {
  VoiceCommandResult,
  VoiceProductSummary,
  VoiceScreenContext
} from "@/app/voice/voice-types";

export function voiceSuccess(
  message: string,
  context?: VoiceScreenContext
): VoiceCommandResult {
  return { ok: true, message, context };
}

export function voiceFailure(
  message: string,
  context?: VoiceScreenContext
): VoiceCommandResult {
  return { ok: false, message, context };
}

export function formatProductResolutionFailure(
  reference: string,
  products: VoiceProductSummary[]
) {
  const result = resolveProductReference(products, reference);

  if (result.kind === "ambiguous") {
    return `I found multiple products for "${reference}": ${result.matches
      .map((product) => product.name)
      .join(", ")}. Please say the exact product name.`;
  }

  return `I could not find a product matching "${reference}".`;
}

export async function runVoiceCommand(
  commands: PromoWorkflowCommands,
  command: keyof PromoWorkflowCommands,
  ...args: never[]
) {
  const action = commands[command] as (...values: never[]) => Promise<VoiceCommandResult>;

  return action(...args);
}
