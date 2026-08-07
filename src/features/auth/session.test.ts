import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { config } from "@/core/config";
import { createSessionToken, verifySessionToken } from "@/features/auth/session";

const encodedKey = new TextEncoder().encode(config.SESSION_SECRET);

const payload = { userId: "user-1", role: "YONETICI" } as const;

describe("sessionToken", () => {
  it("createSessionToken → verifySessionToken roundtrip userId/role korur", async () => {
    const token = await createSessionToken(payload);
    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-1");
    expect(verified?.role).toBe("YONETICI");
  });

  it("süresi dolmuş token null döner", async () => {
    const expired = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("-1s")
      .sign(encodedKey);
    await expect(verifySessionToken(expired)).resolves.toBeNull();
  });

  it("kurcalanmış token null döner", async () => {
    const token = await createSessionToken(payload);
    const tampered = token.slice(0, -2) + (token.endsWith("ab") ? "cd" : "ab");
    await expect(verifySessionToken(tampered)).resolves.toBeNull();
  });

  it("geçersiz token (boş/çöp) null döner", async () => {
    await expect(verifySessionToken(undefined)).resolves.toBeNull();
    await expect(verifySessionToken("cöp-token")).resolves.toBeNull();
  });
});
