import type { NextConfig } from "next";

// Telefonla canlı demo: dev-only asset istekleri LAN origin'inden geldiğinde
// Next.js bunları 403 ile engeller (bkz. README "Telefonla Canlı Demo").
// allowedDevOrigins APP_URL'den türetilir — IP değişince .env güncellemesi yeterli.
function devOrigins(): string[] {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return [];
  try {
    return [new URL(appUrl).hostname];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3", "sharp"],
  experimental: {
    authInterrupts: true,
  },
  allowedDevOrigins: devOrigins(),
};

export default nextConfig;
