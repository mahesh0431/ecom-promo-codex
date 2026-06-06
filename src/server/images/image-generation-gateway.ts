export const IMAGE_GENERATION_MODEL = "gpt-image-2";
export const IMAGE_GENERATION_SIZE = "1024x1024";
export const IMAGE_GENERATION_QUALITY = "low";
export const IMAGE_GENERATION_OUTPUT_FORMAT = "jpeg";
export const MAX_IMAGE_VARIANTS = 2;

export type GenerateCampaignImageInput = {
  prompt: string;
  variants: number;
};

export type GeneratedImage = {
  bytes: Buffer;
  mimeType: string;
  model: string;
  size: string;
};

export interface ImageGenerationGateway {
  generateImages(input: GenerateCampaignImageInput): Promise<GeneratedImage[]>;
}
