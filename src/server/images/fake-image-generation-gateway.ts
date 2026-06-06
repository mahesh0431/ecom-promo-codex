import {
  IMAGE_GENERATION_SIZE,
  type GenerateCampaignImageInput,
  type GeneratedImage,
  type ImageGenerationGateway
} from "@/server/images/image-generation-gateway";

const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z";

export function createFakeImageGenerationGateway(): ImageGenerationGateway {
  return new FakeImageGenerationGateway();
}

class FakeImageGenerationGateway implements ImageGenerationGateway {
  async generateImages(input: GenerateCampaignImageInput): Promise<GeneratedImage[]> {
    return Array.from({ length: input.variants }, (_, index) => ({
      bytes: Buffer.from(TINY_JPEG_BASE64, "base64"),
      mimeType: "image/jpeg",
      model: "fake-gpt-image-2",
      size: IMAGE_GENERATION_SIZE
    }));
  }
}
