import { describe, expect, test } from "vitest";

import { AppError } from "@/server/errors";
import {
  IMAGE_GENERATION_SIZE
} from "@/server/images/image-generation-gateway";
import { createOpenAIImageGenerationGatewayForClient } from "@/server/images/openai-image-generation-gateway";

const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z";

describe("OpenAI image generation gateway", () => {
  test("rejects partial provider output instead of saving fewer variants", async () => {
    const gateway = createOpenAIImageGenerationGatewayForClient(
      createClientReturning([{ b64_json: TINY_JPEG_BASE64 }, {}])
    );

    await expect(
      gateway.generateImages({ prompt: "Saved prompt", variants: 2 })
    ).rejects.toMatchObject({
      code: "IMAGE_GENERATION_ERROR",
      status: 502
    });
  });

  test("maps complete provider output into generated image bytes", async () => {
    const gateway = createOpenAIImageGenerationGatewayForClient(
      createClientReturning([{ b64_json: TINY_JPEG_BASE64 }])
    );

    const images = await gateway.generateImages({
      prompt: "Saved prompt",
      variants: 1
    });

    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      mimeType: "image/jpeg",
      size: IMAGE_GENERATION_SIZE
    });
    expect(images[0]?.bytes.length).toBeGreaterThan(0);
  });

  test("rejects malformed image bytes", async () => {
    const gateway = createOpenAIImageGenerationGatewayForClient(
      createClientReturning([{ b64_json: Buffer.from("not a jpeg").toString("base64") }])
    );

    await expect(
      gateway.generateImages({ prompt: "Saved prompt", variants: 1 })
    ).rejects.toMatchObject({
      code: "IMAGE_GENERATION_ERROR",
      status: 502
    });
  });
});

function createClientReturning(data: Array<{ b64_json?: string }>) {
  return {
    images: {
      async generate(input: { prompt: string }) {
        if (!input.prompt) {
          throw new AppError("IMAGE_GENERATION_ERROR", "Missing prompt.", 502);
        }

        return { data };
      }
    }
  };
}
