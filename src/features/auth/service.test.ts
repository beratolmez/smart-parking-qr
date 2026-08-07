import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/db";
import { ValidationError } from "@/core/errors";
import { authenticate, hashPassword } from "@/features/auth/service";

async function createTestUser(overrides: { username?: string; password?: string } = {}) {
  const password = overrides.password ?? "guclu-sifre-123";
  return prisma.user.create({
    data: {
      username: overrides.username ?? "test-user",
      passwordHash: await hashPassword(password),
      fullName: "Test Kullanıcı",
      role: "SAHA_GOREVLISI",
    },
  });
}

describe("authService.hashPassword", () => {
  it("şifreyi bcrypt ile hashler ve compare doğrular", async () => {
    const hash = await hashPassword("guclu-sifre-123");
    expect(hash).not.toContain("guclu-sifre-123");
    await expect(bcrypt.compare("guclu-sifre-123", hash)).resolves.toBe(true);
    await expect(bcrypt.compare("yanlis-sifre", hash)).resolves.toBe(false);
  });
});

describe("authService.authenticate", () => {
  it("doğru şifreyle kullanıcıyı döner", async () => {
    const user = await createTestUser();
    const result = await authenticate("test-user", "guclu-sifre-123");
    expect(result.id).toBe(user.id);
    expect(result.username).toBe("test-user");
    expect(result.role).toBe("SAHA_GOREVLISI");
  });

  it("yanlış şifreyle ValidationError fırlatır", async () => {
    await createTestUser();
    await expect(authenticate("test-user", "yanlis-sifre")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("olmayan kullanıcı için aynı genel mesajla ValidationError fırlatır", async () => {
    await createTestUser();
    const wrongPassword = await authenticate("test-user", "yanlis-sifre").catch((e) => e);
    const noUser = await authenticate("olmayan-kullanici", "guclu-sifre-123").catch((e) => e);
    expect(wrongPassword).toBeInstanceOf(ValidationError);
    expect(noUser).toBeInstanceOf(ValidationError);
    expect(wrongPassword.message).toBe(noUser.message);
    expect(wrongPassword.message).toBe("Kullanıcı adı veya şifre hatalı.");
  });
});
