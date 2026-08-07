import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3", "sharp"],
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
