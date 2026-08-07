import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { config } from "@/core/config";
import { ValidationError } from "@/core/errors";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;

export async function processPhoto(buffer: Buffer): Promise<Buffer> {
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new ValidationError("Yüklenen dosya geçerli bir görsel değil.");
  }
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new ValidationError("Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.");
  }
  // .rotate() EXIF yönünü piksele uygular; .withMetadata() çağrılmadığı için
  // EXIF/GPS dahil tüm metadata çıktıda yok olur (KVKK gereksinimi).
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

export async function savePhoto(buffer: Buffer): Promise<string> {
  const filename = `${randomUUID()}.webp`;
  const filePath = path.join(config.UPLOAD_DIR, filename);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}
