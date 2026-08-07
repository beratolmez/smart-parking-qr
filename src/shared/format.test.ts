import { describe, expect, it } from "vitest";
import { formatDateTR, formatDurationTR } from "@/shared/format";

describe("formatDurationTR", () => {
  it("1 dakikanın altında '1 saatten az' döner", () => {
    expect(formatDurationTR(0)).toBe("1 saatten az");
    expect(formatDurationTR(59_999)).toBe("1 saatten az");
  });

  it("yalnızca dakikayı gösterir", () => {
    expect(formatDurationTR(45 * 60_000)).toBe("45 dakika");
    expect(formatDurationTR(89 * 60_000)).toBe("1 saat 29 dakika");
  });

  it("saat ve dakikayı birleştirir", () => {
    expect(formatDurationTR(3 * 60 * 60_000)).toBe("3 saat");
    expect(formatDurationTR(3 * 60 * 60_000 + 45 * 60_000)).toBe("3 saat 45 dakika");
  });

  it("gün ve saati birleştirir", () => {
    expect(formatDurationTR(3 * 24 * 60 * 60_000)).toBe("3 gün");
    expect(formatDurationTR(3 * 24 * 60 * 60_000 + 7 * 60 * 60_000)).toBe("3 gün 7 saat");
  });

  it("tam günde sıfır dakika/saat sarkmaz", () => {
    expect(formatDurationTR(2 * 24 * 60 * 60_000)).toBe("2 gün");
  });

  it("negatif değerde '1 saatten az' döner", () => {
    expect(formatDurationTR(-5_000)).toBe("1 saatten az");
  });
});

describe("formatDateTR", () => {
  it("Türkçe locale'de tarih biçimler", () => {
    expect(formatDateTR(new Date(2026, 7, 7))).toMatch(/Ağu/);
  });

  it("null/undefined/boşta em dash döner", () => {
    expect(formatDateTR(null)).toBe("—");
    expect(formatDateTR(undefined)).toBe("—");
  });
});
