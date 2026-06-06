import { getServerEnv } from "@/server/env";
import { AppError } from "@/server/errors";
import { createFakeImageGenerationGateway } from "@/server/images/fake-image-generation-gateway";
import type { ImageGenerationGateway } from "@/server/images/image-generation-gateway";
import { OpenAIImageGenerationGateway } from "@/server/images/openai-image-generation-gateway";

export function createImageGenerationGateway(): ImageGenerationGateway {
  const { imageGenerationMode, openaiApiKey } = getServerEnv();
  const hasExplicitImageGenerationMode = Boolean(
    process.env.IMAGE_GENERATION_MODE
  );

  if (
    imageGenerationMode === "fake" ||
    (!hasExplicitImageGenerationMode && process.env.NODE_ENV === "test")
  ) {
    return createFakeImageGenerationGateway();
  }

  if (!openaiApiKey) {
    throw new AppError(
      "IMAGE_GENERATION_UNAVAILABLE",
      "OpenAI image generation is unavailable because OPENAI_API_KEY is not configured.",
      503
    );
  }

  return new OpenAIImageGenerationGateway(openaiApiKey);
}
