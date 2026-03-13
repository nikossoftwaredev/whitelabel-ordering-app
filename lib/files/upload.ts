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

export const IMAGES_BUCKET = "images";

const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 85;

const compressImage = async (buffer: Buffer): Promise<Buffer> => {
  return sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
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
  const urlParts = fileUrl.split(`/public/${IMAGES_BUCKET}/`);
  if (urlParts.length !== 2) throw new Error("Invalid file URL format");

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: IMAGES_BUCKET,
      Key: urlParts[1],
    })
  );
};
