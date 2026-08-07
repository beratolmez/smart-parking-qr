import { beforeEach, describe, expect, it } from "vitest";
import { RateLimitError } from "@/core/errors";
import { _resetRateLimits, checkRateLimit } from "@/core/rate-limit";

let nowValue = 1_000_000;
const now = () => nowValue;

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimits();
    nowValue = 1_000_000;
  });

  it("limit aşılınca RateLimitError fırlatır", () => {
    checkRateLimit("k", 1, 300_000, now);
    expect(() => checkRateLimit("k", 1, 300_000, now)).toThrow(RateLimitError);
  });

  it("pencere dolunca sayaç sıfırlanır", () => {
    checkRateLimit("k", 1, 300_000, now);
    nowValue += 300_001;
    expect(() => checkRateLimit("k", 1, 300_000, now)).not.toThrow();
  });

  it("farklı anahtarlar bağımsızdır", () => {
    checkRateLimit("a", 1, 300_000, now);
    expect(() => checkRateLimit("b", 1, 300_000, now)).not.toThrow();
    expect(() => checkRateLimit("a", 1, 300_000, now)).toThrow(RateLimitError);
  });

  it("limit içindeki ardışık istekler başarılı olur", () => {
    checkRateLimit("k", 3, 300_000, now);
    checkRateLimit("k", 3, 300_000, now);
    expect(() => checkRateLimit("k", 3, 300_000, now)).not.toThrow();
    expect(() => checkRateLimit("k", 3, 300_000, now)).toThrow(RateLimitError);
  });
});
