export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type ImageType = "product" | "logo" | "cover";

export const IMAGE_TYPE_FOLDER: Record<ImageType, string> = {
  product: "products",
  logo: "logos",
  cover: "covers",
};
