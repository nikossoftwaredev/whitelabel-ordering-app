import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

// S3-compatible storage configuration
const s3Client = new S3Client({
  region: process.env.SUPABASE_S3_REGION!,
  endpoint: process.env.SUPABASE_S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export const IMAGES_BUCKET = "uploads";

export type ImageType = "product" | "logo" | "cover";

export const IMAGE_TYPE_FOLDER: Record<ImageType, string> = {
  product: "products",
  logo: "logos",
  cover: "covers",
};

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 85;

const compressImage = async (buffer: Buffer): Promise<Buffer> => {
  return sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 5 })
    .toBuffer();
};

export const uploadFile = async (
  file: Buffer,
  fileName: string,
): Promise<string> => {
  const compressed = await compressImage(file);
  const webpFileName = fileName.replace(/\.\w+$/, ".webp");

  const command = new PutObjectCommand({
    Bucket: IMAGES_BUCKET,
    Key: webpFileName,
    Body: compressed,
    ContentType: "image/webp",
  });

  await s3Client.send(command);

  const projectRef = process.env
    .SUPABASE_S3_ENDPOINT!.replace("https://", "")
    .replace(".storage.supabase.co/storage/v1/s3", "");

  return `https://${projectRef}.supabase.co/storage/v1/object/public/${IMAGES_BUCKET}/${webpFileName}`;
};

export const deleteFile = async (fileUrl: string): Promise<void> => {
  // Support URLs from any bucket name (handles legacy "uploads" and current "images")
  const match = fileUrl.match(/\/public\/([^/]+)\/(.+)$/);
  if (!match) throw new Error("Invalid file URL format");
  const [, bucket, key] = match;

  await s3Client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
};
