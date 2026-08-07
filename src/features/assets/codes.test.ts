import { describe, expect, it } from "vitest";
import { formatAssetCode, normalizeAssetCode, parseAssetCode } from "@/features/assets/codes";

describe("formatAssetCode", () => {
  it("sıfır dolgusu uygular", () => {
    expect(formatAssetCode("BANK", 7)).toBe("BANK-0007");
    expect(formatAssetCode("BANK", 147)).toBe("BANK-0147");
    expect(formatAssetCode("BANK", 10000)).toBe("BANK-10000");
  });
});

describe("parseAssetCode", () => {
  it("geçerli kodu ayrıştırır", () => {
    expect(parseAssetCode("BANK-0147")).toEqual({ prefix: "BANK", sequence: 147 });
  });

  it("geçersiz girdide null döner", () => {
    expect(parseAssetCode("GEÇERSİZ")).toBeNull();
    expect(parseAssetCode("")).toBeNull();
    expect(parseAssetCode("BANK")).toBeNull();
  });
});

describe("normalizeAssetCode", () => {
  it("boşlukları ve küçük harfi temizler", () => {
    expect(normalizeAssetCode(" bank-147 ")).toBe("BANK-0147");
  });

  it("eksik tireyi tamamlar", () => {
    expect(normalizeAssetCode("BANK147")).toBe("BANK-0147");
    expect(normalizeAssetCode("bank 147")).toBe("BANK-0147");
  });

  it("Türkçe 'i' tuzağına düşmez", () => {
    expect(normalizeAssetCode("bank-1")).toBe("BANK-0001");
    expect(normalizeAssetCode("bank-1")).not.toContain("İ");
  });
});
