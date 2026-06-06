import OpenAI from "openai";

import { AppError, isAppError } from "@/server/errors";
import {
  IMAGE_GENERATION_MODEL,
  IMAGE_GENERATION_OUTPUT_FORMAT,
  IMAGE_GENERATION_QUALITY,
  IMAGE_GENERATION_SIZE,
  type GenerateCampaignImageInput,
  type GeneratedImage,
  type ImageGenerationGateway
} from "@/server/images/image-generation-gateway";

type OpenAIImageClient = {
  images: {
    generate(input: {
      model: string;
      prompt: string;
      n: number;
      size: typeof IMAGE_GENERATION_SIZE;
      quality: typeof IMAGE_GENERATION_QUALITY;
      output_format: typeof IMAGE_GENERATION_OUTPUT_FORMAT;
    }): Promise<{
      data?: Array<{
        b64_json?: string | null;
      }>;
    }>;
  };
};

export class OpenAIImageGenerationGateway implements ImageGenerationGateway {
  private readonly client: OpenAIImageClient;

  constructor(apiKey: string);
  constructor(client: OpenAIImageClient);
  constructor(input: string | OpenAIImageClient) {
    this.client =
      typeof input === "string"
        ? (new OpenAI({ apiKey: input }) as unknown as OpenAIImageClient)
        : input;
  }

  static fromClient(client: OpenAIImageClient) {
    return new OpenAIImageGenerationGateway(client);
  }

  async generateImages(input: GenerateCampaignImageInput): Promise<GeneratedImage[]> {
    try {
      const result = await this.client.images.generate({
        model: IMAGE_GENERATION_MODEL,
        prompt: input.prompt,
        n: input.variants,
        size: IMAGE_GENERATION_SIZE,
        quality: IMAGE_GENERATION_QUALITY,
        output_format: IMAGE_GENERATION_OUTPUT_FORMAT
      });

      const rawImages = result.data ?? [];

      if (rawImages.length !== input.variants) {
        throw new AppError(
          "IMAGE_GENERATION_ERROR",
          "OpenAI did not return the requested image count.",
          502
        );
      }

      const images = rawImages.map((image) => {
        if (!image.b64_json) {
          throw new AppError(
            "IMAGE_GENERATION_ERROR",
            "OpenAI did not return usable image data.",
            502
          );
        }

        return {
          bytes: Buffer.from(image.b64_json, "base64"),
          mimeType: "image/jpeg",
          model: IMAGE_GENERATION_MODEL,
          size: IMAGE_GENERATION_SIZE
        };
      });

      if (images.some((image) => !isUsableJpeg(image.bytes))) {
        throw new AppError(
          "IMAGE_GENERATION_ERROR",
          "OpenAI did not return usable image data.",
          502
        );
      }

      return images;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }

      throw new AppError(
        "IMAGE_GENERATION_ERROR",
        "OpenAI image generation failed.",
        502
      );
    }
  }
}

export function createOpenAIImageGenerationGatewayForClient(
  client: OpenAIImageClient
) {
  return OpenAIImageGenerationGateway.fromClient(client);
}

function isUsableJpeg(bytes: Buffer) {
  return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}
