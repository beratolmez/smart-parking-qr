import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { config } from "@/core/config";
import { ValidationError } from "@/core/errors";
import { processPhoto, savePhoto } from "@/features/reports/photos";

function jpegBuffer(width = 2400, height = 1800): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#ccc" } })
    .jpeg()
    .toBuffer();
}

describe("processPhoto", () => {
  it("büyük görseli 1600px'i aşmayacak şekilde küçültüp WebP'e çevirir ve EXIF'i temizler", async () => {
    const output = await processPhoto(await jpegBuffer());
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width!).toBeLessThanOrEqual(1600);
    expect(metadata.height!).toBeLessThanOrEqual(1600);
    expect(metadata.exif).toBeUndefined();
  });

  it("EXIF orientation 6 içeren görselde yön piksele uygulanır ve çıktıda EXIF kalmaz", async () => {
    const buffer = await sharp({
      create: { width: 800, height: 1200, channels: 3, background: "#fff" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const output = await processPhoto(buffer);
    const metadata = await sharp(output).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(800);
  });

  it("küçük görseli büyütmez", async () => {
    const output = await processPhoto(await jpegBuffer(300, 200));
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(300);
    expect(metadata.height).toBe(200);
  });

  it("düz metin buffer için ValidationError fırlatır", async () => {
    await expect(processPhoto(Buffer.from("bu bir görsel değil"))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("savePhoto", () => {
  it("/uploads/ ile başlayan URL döner ve dosyayı diske yazar", async () => {
    const buffer = await processPhoto(await jpegBuffer());
    const url = await savePhoto(buffer);
    expect(url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.webp$/);
    const filePath = path.join(config.UPLOAD_DIR, url.replace("/uploads/", ""));
    expect(existsSync(filePath)).toBe(true);
  });
});
