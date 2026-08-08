import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, transitionReportSchema } from "@/features/reports/schemas";

function parse(photo?: File) {
  return transitionReportSchema.safeParse({
    reportId: "report-1",
    toStatus: "ATANDI",
    note: "Üstlendim",
    photo,
  });
}

describe("transitionReportSchema.photo", () => {
  it("boş dosya input'u (size 0 File) photo'yu undefined yapar, parse başarılı olur", () => {
    const result = parse(new File([], "bos.jpg", { type: "application/octet-stream" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.photo).toBeUndefined();
  });

  it("hiç fotoğraf gönderilmezse parse başarılı olur", () => {
    expect(parse().success).toBe(true);
  });

  it("geçerli görsel parse başarılı olur ve photo File olarak döner", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "foto.jpg", { type: "image/jpeg" });
    const result = parse(file);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.photo).toBe(file);
  });

  it("izinli olmayan MIME türü reddedilir", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "belge.txt", { type: "text/plain" });
    const result = parse(file);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.photo?.[0]).toBe("Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz.");
    }
  });

  it("10 MB'ı aşan görsel reddedilir", () => {
    const big = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "buyuk.jpg", { type: "image/jpeg" });
    const result = parse(big);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.photo?.[0]).toBe("Fotoğraf en fazla 10 MB olabilir.");
    }
  });
});
