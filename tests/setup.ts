import { execSync } from "node:child_process";
import { beforeEach } from "vitest";

process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.APP_URL = "http://localhost:3000";
process.env.MUNICIPALITY_NAME = "Test Belediyesi";
process.env.UPLOAD_DIR = "./tests/.uploads";

execSync("npx prisma migrate deploy", { stdio: "inherit" });

beforeEach(async () => {
  const { prisma } = await import("@/core/db");
  await prisma.report.deleteMany();
  await prisma.reportCounter.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.park.deleteMany();
  await prisma.assetCodeCounter.deleteMany();
});
